#!/usr/bin/env python3
"""Test script for SimUCI integration."""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Test SimUCI import
try:
    from simuci import Experiment, single_run, multiple_replication
    print("✓ SimUCI imported successfully")
except ImportError as e:
    print(f"✗ Failed to import SimUCI: {e}")
    sys.exit(1)

# Test simulation logic
def test_simulation():
    """Test basic simulation functionality."""
    centroids_path = Path(__file__).parent / "data" / "centroids.csv"
    
    if not centroids_path.exists():
        print(f"✗ Centroids file not found at {centroids_path}")
        return False
    
    print(f"✓ Centroids file found at {centroids_path}")
    
    # Create a test experiment
    try:
        experiment = Experiment(
            age=55,
            diagnosis_admission1=11,
            diagnosis_admission2=0,
            diagnosis_admission3=0,
            diagnosis_admission4=0,
            apache=20,
            respiratory_insufficiency=5,
            artificial_ventilation=1,
            uti_stay=100,
            vam_time=50,
            preuti_stay_time=10,
            percent=10,
            validate=True
        )
        print("✓ Experiment created successfully")
    except Exception as e:
        print(f"✗ Failed to create experiment: {e}")
        return False
    
    # Run single simulation
    try:
        result = single_run(experiment, centroids_path=str(centroids_path))
        print(f"✓ Single simulation run completed: {result}")
    except Exception as e:
        print(f"✗ Single simulation failed: {e}")
        return False
    
    # Run multiple replications (small sample)
    try:
        results_df = multiple_replication(
            experiment,
            n_reps=5,
            centroids_path=str(centroids_path)
        )
        print(f"✓ Multiple replications completed")
        print(f"  Results shape: {results_df.shape}")
        print(f"  Columns: {list(results_df.columns)}")
        print(f"  Mean values:\n{results_df.mean()}")
    except Exception as e:
        print(f"✗ Multiple replications failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("\n=== Testing SimUCI Integration ===\n")
    
    success = test_simulation()
    
    if success:
        print("\n✓ All tests passed!")
        sys.exit(0)
    else:
        print("\n✗ Some tests failed")
        sys.exit(1)
