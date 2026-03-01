import os
import zipfile
import shutil

def package_app():
    app_name = "MOVIEFY_Windows_Distribution"
    zip_filename = f"{app_name}.zip"
    
    # Files and folders to include
    include_paths = [
        "backend",
        "frontend/dist",
        "setup_wizard.bat",
        "START_MOVIEFY.bat",
        "README_DIST.txt"
    ]
    
    # Folders/Files to exclude within included paths
    exclude_patterns = [
        "__pycache__",
        "node_modules",
        ".git",
        ".env",
        "run_backend.py",
        "venv"
    ]

    print(f"Creating {zip_filename}...")
    
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for path in include_paths:
            if not os.path.exists(path):
                print(f"[WARNING] Path not found: {path}")
                continue
                
            if os.path.isfile(path):
                zipf.write(path, arcname=os.path.join(app_name, os.path.basename(path)))
                print(f"Added file: {path}")
            else:
                for root, dirs, files in os.walk(path):
                    # Filter out excluded directories
                    dirs[:] = [d for d in dirs if d not in exclude_patterns]
                    
                    for file in files:
                        if any(pat in file for pat in exclude_patterns):
                            continue
                            
                        full_path = os.path.join(root, file)
                        # Create relative path inside zip
                        rel_path = os.path.relpath(full_path, os.path.dirname(path))
                        archive_name = os.path.join(app_name, os.path.basename(path), rel_path)
                        
                        # Special case for frontend/dist to keep it clean
                        if "frontend/dist" in path:
                            rel_path = os.path.relpath(full_path, "frontend/dist")
                            archive_name = os.path.join(app_name, "frontend", "dist", rel_path)

                        zipf.write(full_path, arcname=archive_name)
                print(f"Added directory: {path}")

    print(f"\nSUCCESS! Distribution package created at: {os.path.abspath(zip_filename)}")

if __name__ == "__main__":
    package_app()
