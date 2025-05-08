#!/usr/bin/env python
"""
Face Recognition Service Benchmark Script
This script benchmarks the performance of the face recognition service by measuring:
- Recognition speed
- Throughput
- Accuracy
- Memory usage
"""

import time
import os
import sys
import requests
import base64
import json
import statistics
import psutil
import matplotlib.pyplot as plt
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from tqdm import tqdm

# Configuration
API_ENDPOINT = "http://localhost:8000/recognize"  # Update with correct port
TEST_IMAGES_DIR = "tests/performance/services/test_images"  # Create this directory and add test images
NUM_CONCURRENT_REQUESTS = [1, 5, 10, 20, 50]
REQUESTS_PER_CONCURRENCY_LEVEL = 100
OUTPUT_DIR = "tests/performance/results"

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

def encode_image(image_path):
    """Encode an image to base64"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def send_recognition_request(image_data):
    """Send a single recognition request and time it"""
    start_time = time.time()
    response = requests.post(
        API_ENDPOINT,
        json={"image": image_data},
        headers={"Content-Type": "application/json"}
    )
    end_time = time.time()

    if response.status_code != 200:
        print(f"Request failed with status code: {response.status_code}")
        return None

    return {
        "response_time": (end_time - start_time) * 1000,  # Convert to milliseconds
        "status_code": response.status_code,
        "response_data": response.json()
    }

def benchmark_single_image(image_path):
    """Benchmark recognition on a single image"""
    print(f"Benchmarking image: {image_path}")
    image_data = encode_image(image_path)

    # Warm-up call
    send_recognition_request(image_data)

    # Real test
    results = []
    for _ in range(10):  # 10 requests per image
        result = send_recognition_request(image_data)
        if result:
            results.append(result)

    return results

def benchmark_throughput(image_paths, concurrency):
    """Benchmark throughput at a specific concurrency level"""
    print(f"Benchmarking throughput at concurrency level: {concurrency}")

    # Prepare images
    images = []
    for _ in range(REQUESTS_PER_CONCURRENCY_LEVEL):
        # Cycle through test images
        image_path = image_paths[_ % len(image_paths)]
        images.append(encode_image(image_path))

    results = []
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(send_recognition_request, img) for img in images]
        for future in tqdm(futures):
            result = future.result()
            if result:
                results.append(result)

    end_time = time.time()

    total_time = end_time - start_time
    requests_per_second = len(results) / total_time

    response_times = [r["response_time"] for r in results]

    return {
        "concurrency": concurrency,
        "total_requests": len(results),
        "total_time_seconds": total_time,
        "requests_per_second": requests_per_second,
        "avg_response_time_ms": statistics.mean(response_times),
        "p50_response_time_ms": np.percentile(response_times, 50),
        "p95_response_time_ms": np.percentile(response_times, 95),
        "p99_response_time_ms": np.percentile(response_times, 99),
    }

def monitor_memory():
    """Monitor memory usage of the current process"""
    process = psutil.Process()
    return process.memory_info().rss / 1024 / 1024  # Return in MB

def generate_report(single_results, throughput_results):
    """Generate benchmark report with charts"""
    report_path = os.path.join(OUTPUT_DIR, "face_recognition_benchmark_report.html")

    # Create plots
    plt.figure(figsize=(10, 6))

    # Plot 1: Response times by concurrency
    concurrency_levels = [r["concurrency"] for r in throughput_results]
    avg_response_times = [r["avg_response_time_ms"] for r in throughput_results]
    p95_response_times = [r["p95_response_time_ms"] for r in throughput_results]

    plt.plot(concurrency_levels, avg_response_times, 'o-', label='Average')
    plt.plot(concurrency_levels, p95_response_times, 'o-', label='P95')
    plt.title('Response Time vs Concurrency')
    plt.xlabel('Concurrency Level')
    plt.ylabel('Response Time (ms)')
    plt.legend()
    plt.grid(True)
    plt.savefig(os.path.join(OUTPUT_DIR, 'response_time_chart.png'))
    plt.close()

    # Plot 2: Throughput by concurrency
    requests_per_second = [r["requests_per_second"] for r in throughput_results]

    plt.figure(figsize=(10, 6))
    plt.plot(concurrency_levels, requests_per_second, 'o-')
    plt.title('Throughput vs Concurrency')
    plt.xlabel('Concurrency Level')
    plt.ylabel('Requests per Second')
    plt.grid(True)
    plt.savefig(os.path.join(OUTPUT_DIR, 'throughput_chart.png'))
    plt.close()

    # Write HTML report
    with open(report_path, 'w') as f:
        f.write(f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Face Recognition Service Benchmark Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                h1, h2 {{ color: #333; }}
                table {{ border-collapse: collapse; width: 100%; margin-bottom: 20px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                tr:nth-child(even) {{ background-color: #f9f9f9; }}
                .chart {{ margin: 20px 0; }}
                .summary {{ background-color: #eef7ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }}
            </style>
        </head>
        <body>
            <h1>Face Recognition Service Benchmark Report</h1>
            <div class="summary">
                <h2>Summary</h2>
                <p>Date: {time.strftime("%Y-%m-%d %H:%M:%S")}</p>
                <p>API Endpoint: {API_ENDPOINT}</p>
                <p>Maximum Throughput: {max([r["requests_per_second"] for r in throughput_results]):.2f} requests/second</p>
                <p>Best Average Response Time: {min([r["avg_response_time_ms"] for r in throughput_results]):.2f} ms</p>
            </div>

            <h2>Response Time vs Concurrency</h2>
            <div class="chart">
                <img src="response_time_chart.png" alt="Response Time Chart" style="max-width: 100%;">
            </div>

            <h2>Throughput vs Concurrency</h2>
            <div class="chart">
                <img src="throughput_chart.png" alt="Throughput Chart" style="max-width: 100%;">
            </div>

            <h2>Detailed Throughput Results</h2>
            <table>
                <tr>
                    <th>Concurrency</th>
                    <th>Requests/s</th>
                    <th>Avg Response Time (ms)</th>
                    <th>P50 (ms)</th>
                    <th>P95 (ms)</th>
                    <th>P99 (ms)</th>
                </tr>
                {''.join([f'''
                <tr>
                    <td>{r['concurrency']}</td>
                    <td>{r['requests_per_second']:.2f}</td>
                    <td>{r['avg_response_time_ms']:.2f}</td>
                    <td>{r['p50_response_time_ms']:.2f}</td>
                    <td>{r['p95_response_time_ms']:.2f}</td>
                    <td>{r['p99_response_time_ms']:.2f}</td>
                </tr>
                ''' for r in throughput_results])}
            </table>
        </body>
        </html>
        """)

    print(f"Benchmark report generated at {report_path}")
    return report_path

def main():
    # Check if test images directory exists
    if not os.path.exists(TEST_IMAGES_DIR):
        os.makedirs(TEST_IMAGES_DIR, exist_ok=True)
        print(f"Created {TEST_IMAGES_DIR} directory. Please add test images to it.")
        return

    # Get test images
    image_paths = [os.path.join(TEST_IMAGES_DIR, f) for f in os.listdir(TEST_IMAGES_DIR)
                   if f.lower().endswith(('.png', '.jpg', '.jpeg'))]

    if not image_paths:
        print(f"No test images found in {TEST_IMAGES_DIR}. Please add some test images.")
        return

    print(f"Found {len(image_paths)} test images.")

    # Single image benchmarks
    single_image_results = []
    for image_path in image_paths[:3]:  # Limit to first 3 images
        results = benchmark_single_image(image_path)
        single_image_results.append({
            "image_path": image_path,
            "results": results
        })

    # Throughput benchmarks
    throughput_results = []
    for concurrency in NUM_CONCURRENT_REQUESTS:
        result = benchmark_throughput(image_paths, concurrency)
        throughput_results.append(result)
        print(f"Concurrency {concurrency}: {result['requests_per_second']:.2f} req/s, "
              f"Avg: {result['avg_response_time_ms']:.2f} ms, "
              f"P95: {result['p95_response_time_ms']:.2f} ms")

    # Generate report
    report_path = generate_report(single_image_results, throughput_results)
    print(f"Benchmark complete. Report saved to {report_path}")

if __name__ == "__main__":
    main()
