#!/usr/bin/env python3
import subprocess
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # Import for 3D plotting
import numpy as np
import re
import os
import sys
from datetime import datetime

def run_benchmark():
    """Run the Node.js benchmark and capture its output"""
    print("Running PoW benchmark...")
    
    # Get the directory of this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Navigate to the captcha directory (assuming this script is in captcha/packages/util/src)
    captcha_dir = os.path.abspath(os.path.join(script_dir, "../../../"))
    
    # Run the Node.js script and stream output in real-time
    try:
        # Start the process
        process = subprocess.Popen(
            ["node", "packages/util/dist/solverService.js"],
            cwd=captcha_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1  # Line buffered
        )
        
        # Capture all output for later parsing
        all_output = ""
        
        # Print output in real-time
        print("\n--- Node.js Benchmark Output ---")
        for line in iter(process.stdout.readline, ''):
            print(line, end='')  # Print the line to console
            all_output += line   # Save for later parsing
            
            # Check if the process has ended
            if process.poll() is not None:
                break
                
        # Get any remaining output
        stdout, stderr = process.communicate()
        all_output += stdout
        
        # Check if there was an error
        if process.returncode != 0:
            print("\nError in Node.js process:")
            print(stderr)
            raise subprocess.CalledProcessError(process.returncode, "node", output=all_output, stderr=stderr)
            
        print("\n--- End of Node.js Output ---\n")
        return all_output
        
    except subprocess.CalledProcessError as e:
        print(f"Error running benchmark: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        sys.exit(1)

def parse_results(output):
    """Parse the benchmark results from the output"""
    # Look for the CSV data section for average times
    csv_section = re.search(r"CSV Data for Plotting:\s*\n(difficulty,avgTime\s*\n(?:[\d\.]+,[\d\.]+\s*\n)+)", output)
    
    if not csv_section:
        print("Could not find CSV data in the output")
        print("Output was:")
        print(output)
        sys.exit(1)
    
    # Extract the CSV data for average times
    csv_data = csv_section.group(1)
    
    # Parse the CSV data for average times
    difficulties = []
    times = []
    
    print("Parsing average time data:")
    for line in csv_data.strip().split('\n')[1:]:  # Skip header
        if not line.strip():
            continue
        try:
            difficulty, avg_time = line.split(',')
            difficulties.append(float(difficulty))
            times.append(float(avg_time))
            print(f"  Parsed: difficulty={difficulty}, avg_time={avg_time}ms")
        except Exception as e:
            print(f"  Error parsing line '{line}': {e}")
    
    if not difficulties:
        print("No valid data points found for average times!")
        sys.exit(1)
        
    print(f"Successfully parsed {len(difficulties)} data points for average times")
    
    # Look for the individual POW results section
    pow_section = re.search(r"All POW Results:\s*\n(difficulty,timeTaken,nonce\s*\n(?:[\d\.]+,[\d\.]+,[\d]+\s*\n)+)", output)
    
    individual_results = []
    
    if pow_section:
        # Extract the CSV data for individual POW results
        pow_data = pow_section.group(1)
        
        print("\nParsing individual POW results:")
        for line in pow_data.strip().split('\n')[1:]:  # Skip header
            if not line.strip():
                continue
            try:
                parts = line.split(',')
                if len(parts) >= 3:
                    difficulty = float(parts[0])
                    time_taken = float(parts[1])
                    nonce = parts[2]  # Keep as string, we don't need to process it
                    individual_results.append({
                        'difficulty': difficulty,
                        'timeTaken': time_taken,
                        'nonce': nonce
                    })
                    print(f"  Parsed: difficulty={difficulty}, time={time_taken}ms, nonce={nonce}")
            except Exception as e:
                print(f"  Error parsing individual POW line '{line}': {e}")
        
        print(f"Successfully parsed {len(individual_results)} individual POW results")
    else:
        print("No individual POW results found in the output")
    
    return difficulties, times, individual_results

def create_plots(difficulties, times, individual_results):
    """Create and save plots of the benchmark results"""
    # Create a timestamp for the filename
    timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    
    # Create the output directory if it doesn't exist
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "benchmark_plots")
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Create a scatter plot with linear trend line
    plt.figure(figsize=(10, 6))
    
    # Plot the data points
    plt.scatter(difficulties, times, s=60, alpha=0.7, label='Measured Data')
    
    # Add a linear trend line
    if len(difficulties) > 1:
        # Convert to numpy arrays
        x = np.array(difficulties)
        y = np.array(times)
        
        # Fit a linear line: y = mx + b
        m, b = np.polyfit(x, y, 1)
        
        # Generate points for the fitted line
        x_fit = np.linspace(min(difficulties), max(difficulties), 100)
        y_fit = m * x_fit + b
        
        # Plot the fitted line
        plt.plot(x_fit, y_fit, 'r-', linewidth=2, 
                 label=f'Linear Fit: y = {m:.2f}x + {b:.2f}')
        
        # Add the equation to the plot
        plt.legend()
    
    plt.title('PoW Difficulty vs. Solving Time (Linear Scale)')
    plt.xlabel('Difficulty (0-1 normalized)')
    plt.ylabel('Average Solving Time (ms)')
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.tight_layout()
    linear_plot_path = os.path.join(output_dir, f"pow_benchmark_linear_{timestamp}.png")
    plt.savefig(linear_plot_path)
    print(f"Linear plot saved to: {linear_plot_path}")
    
    # 2. Create a log scale plot for the y-axis
    plt.figure(figsize=(10, 6))
    plt.semilogy(difficulties, times, 'o', linewidth=2, markersize=8)
    
    # Add a trend line on log scale
    if len(difficulties) > 1:
        # Convert to numpy arrays
        x = np.array(difficulties)
        y = np.array(times)
        
        # Fit exponential: y = a * exp(b * x)
        # Taking log: log(y) = log(a) + b * x
        valid_indices = y > 0  # Avoid log(0)
        if np.sum(valid_indices) > 1:
            x_valid = x[valid_indices]
            y_valid = y[valid_indices]
            
            log_y = np.log(y_valid)
            coeffs = np.polyfit(x_valid, log_y, 1)
            
            # Extract coefficients
            b = coeffs[0]
            a = np.exp(coeffs[1])
            
            # Generate points for the fitted curve
            x_fit = np.linspace(min(difficulties), max(difficulties), 100)
            y_fit = a * np.exp(b * x_fit)
            
            # Plot the fitted curve
            plt.plot(x_fit, y_fit, 'r-', linewidth=2, 
                     label=f'Exponential Fit: {a:.2f} * exp({b:.2f} * x)')
            
            # Add the equation to the plot
            plt.legend()
    
    plt.title('PoW Difficulty vs. Solving Time (Log Scale)')
    plt.xlabel('Difficulty (0-1 normalized)')
    plt.ylabel('Average Solving Time (ms) - Log Scale')
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.tight_layout()
    log_plot_path = os.path.join(output_dir, f"pow_benchmark_log_{timestamp}.png")
    plt.savefig(log_plot_path)
    print(f"Log scale plot saved to: {log_plot_path}")
    
    # 3. Create a heatmap visualization showing difficulty vs. time
    plt.figure(figsize=(12, 8))
    
    # Create a 2D grid for the heatmap
    difficulty_range = np.linspace(min(difficulties), max(difficulties), 100)
    time_range = np.linspace(min(times), max(times), 100)
    
    # Create a grid of points
    X, Y = np.meshgrid(difficulty_range, time_range)
    
    # Calculate Z values (density)
    Z = np.zeros_like(X)
    for i, diff in enumerate(difficulties):
        for j, t in enumerate(times):
            # Calculate distance from each grid point to each data point
            dist = np.sqrt((X - diff)**2 + (Y - t)**2 / (max(times)**2))
            # Add contribution from this data point (inverse of distance)
            Z += 1 / (1 + 10 * dist)
    
    # Plot the heatmap
    plt.contourf(X, Y, Z, levels=20, cmap='viridis')
    plt.colorbar(label='Density')
    
    # Plot the actual data points
    plt.scatter(difficulties, times, c='red', s=80, alpha=0.7, label='Measured Data')
    
    plt.title('PoW Difficulty vs. Solving Time (Density Heatmap)')
    plt.xlabel('Difficulty (0-1 normalized)')
    plt.ylabel('Average Solving Time (ms)')
    plt.legend()
    plt.tight_layout()
    heatmap_path = os.path.join(output_dir, f"pow_benchmark_heatmap_{timestamp}.png")
    plt.savefig(heatmap_path)
    print(f"Heatmap saved to: {heatmap_path}")
    
    # 4. Create a 3D visualization
    fig = plt.figure(figsize=(12, 8))
    ax = fig.add_subplot(111, projection='3d')
    
    # Create a surface plot
    surf = ax.plot_trisurf(difficulties, times, np.log10(times), cmap='viridis', 
                          linewidth=0.2, antialiased=True)
    
    # Add a color bar
    fig.colorbar(surf, ax=ax, shrink=0.5, aspect=5, label='Log10(Time)')
    
    ax.set_title('3D Visualization of PoW Difficulty vs. Time')
    ax.set_xlabel('Difficulty (0-1 normalized)')
    ax.set_ylabel('Time (ms)')
    ax.set_zlabel('Log10(Time)')
    
    # Set the viewing angle
    ax.view_init(30, 45)
    
    plt.tight_layout()
    surface_path = os.path.join(output_dir, f"pow_benchmark_3d_{timestamp}.png")
    plt.savefig(surface_path)
    print(f"3D visualization saved to: {surface_path}")
    
    # 5. Create a bar chart showing time increase with difficulty
    plt.figure(figsize=(12, 6))
    
    # Create the bar chart
    bars = plt.bar(difficulties, times, width=0.03, alpha=0.7)
    
    # Color the bars according to time (gradient)
    norm = plt.Normalize(min(times), max(times))
    colors = plt.cm.viridis(norm(times))
    for bar, color in zip(bars, colors):
        bar.set_color(color)
    
    # Add a color bar - fix the colorbar issue
    sm = plt.cm.ScalarMappable(cmap=plt.cm.viridis, norm=norm)
    sm.set_array([])  # You need to set an array for the mappable
    plt.colorbar(sm, ax=plt.gca(), label='Time (ms)')  # Explicitly provide the current axes
    
    plt.title('PoW Difficulty vs. Solving Time (Bar Chart)')
    plt.xlabel('Difficulty (0-1 normalized)')
    plt.ylabel('Average Solving Time (ms)')
    plt.grid(True, linestyle='--', alpha=0.3, axis='y')
    plt.tight_layout()
    bar_path = os.path.join(output_dir, f"pow_benchmark_bar_{timestamp}.png")
    plt.savefig(bar_path)
    print(f"Bar chart saved to: {bar_path}")
    
    # 6. Create a scatter plot of individual POW results
    if individual_results:
        plt.figure(figsize=(12, 8))
        
        # Extract data from individual results
        individual_difficulties = [r['difficulty'] for r in individual_results]
        individual_times = [r['timeTaken'] for r in individual_results]
        
        # Create scatter plot with different colors for different difficulty levels
        unique_difficulties = sorted(set(individual_difficulties))
        colors = plt.cm.viridis(np.linspace(0, 1, len(unique_difficulties)))
        
        for i, diff in enumerate(unique_difficulties):
            # Get times for this difficulty
            indices = [j for j, d in enumerate(individual_difficulties) if d == diff]
            diff_times = [individual_times[j] for j in indices]
            
            # Plot points for this difficulty
            plt.scatter([diff] * len(diff_times), diff_times, 
                       color=colors[i], alpha=0.7, s=60,
                       label=f'Difficulty {diff:.2f}')  # Format to 2 decimal places
        
        # Add average time points
        plt.plot(difficulties, times, 'ro-', linewidth=2, markersize=10, 
                label='Average Time')
        
        plt.title('Individual POW Results vs. Average Times')
        plt.xlabel('Difficulty (0-1 normalized)')
        plt.ylabel('Solving Time (ms)')
        plt.grid(True, linestyle='--', alpha=0.7)
        plt.legend()
        plt.tight_layout()
        
        individual_plot_path = os.path.join(output_dir, f"pow_benchmark_individual_{timestamp}.png")
        plt.savefig(individual_plot_path)
        print(f"Individual POW results plot saved to: {individual_plot_path}")
        
        # 7. Create a box plot to show the distribution of solving times at each difficulty level
        plt.figure(figsize=(12, 8))
        
        # Group times by difficulty
        difficulty_groups = {}
        for result in individual_results:
            diff = result['difficulty']
            if diff not in difficulty_groups:
                difficulty_groups[diff] = []
            difficulty_groups[diff].append(result['timeTaken'])
        
        # Prepare data for box plot
        box_data = []
        box_labels = []
        
        for diff in sorted(difficulty_groups.keys()):
            box_data.append(difficulty_groups[diff])
            box_labels.append(f"{diff:.2f}")  # Already formatting to 2 decimal places
        
        # Create the box plot
        plt.boxplot(box_data, labels=box_labels, patch_artist=True)
        
        plt.title('Distribution of POW Solving Times by Difficulty')
        plt.xlabel('Difficulty (0-1 normalized)')
        plt.ylabel('Solving Time (ms)')
        plt.grid(True, linestyle='--', alpha=0.7, axis='y')
        plt.tight_layout()
        
        boxplot_path = os.path.join(output_dir, f"pow_benchmark_boxplot_{timestamp}.png")
        plt.savefig(boxplot_path)
        print(f"Box plot saved to: {boxplot_path}")
    
    # Show the plots (optional - comment out if running headless)
    # plt.show()

def main():
    # Run the benchmark
    output = run_benchmark()
    
    # Parse the results
    difficulties, times, individual_results = parse_results(output)
    
    # Create and save the plots
    create_plots(difficulties, times, individual_results)
    
    print("\nBenchmark complete!")
    print(f"Tested {len(difficulties)} difficulty levels from {min(difficulties)} to {max(difficulties)}")
    print(f"Solving times ranged from {min(times):.2f}ms to {max(times):.2f}ms")
    if individual_results:
        print(f"Collected {len(individual_results)} individual POW results")

if __name__ == "__main__":
    main() 