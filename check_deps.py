
import pkg_resources
import sys

def check_requirements(requirements_file):
    with open(requirements_file, 'r') as f:
        requirements = pkg_resources.parse_requirements(f)
        missing = []
        for req in requirements:
            try:
                pkg_resources.require(str(req))
            except (pkg_resources.DistributionNotFound, pkg_resources.VersionConflict) as e:
                missing.append(str(e))
        return missing

if __name__ == "__main__":
    missing = check_requirements('backend/requirements.txt')
    if missing:
        print("Missing or conflicting requirements:")
        for m in missing:
            print(f"  - {m}")
        sys.exit(1)
    else:
        print("All requirements satisfied.")
        sys.exit(0)
