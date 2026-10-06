"""Development measurement wrapper. The child alone runs the native workload."""
import resource
import subprocess
import sys
from pathlib import Path

peak_file, *command = sys.argv[1:]
completed = subprocess.run(command, check=False)
peak = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss
if sys.platform == "darwin":
    peak /= 1024
Path(peak_file).write_text(str(int(peak)) + "\n")
raise SystemExit(completed.returncode)
