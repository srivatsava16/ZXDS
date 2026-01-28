#!/usr/bin/env python3
"""
Comprehensive script to add optional chaining to TypeScript files.
This script is conservative and only fixes patterns that are clearly safe.
"""

import os
import re
from pathlib import Path
from typing import List, Tuple, Dict

SRC_DIR = Path("/mnt/c/Users/SriVatsavaAvanigadda/Desktop/ZXDS latest 7-25/zxds/src")
LOG_FILE = Path("/mnt/c/Users/SriVatsavaAvanigadda/Desktop/ZXDS latest 7-25/zxds/optional-chaining-report.txt")

# Track statistics
stats = {
    'total_files': 0,
    'files_modified': 0,
    'files_unchanged': 0,
    'files_with_errors': 0,
    'total_changes': 0,
    'pattern_counts': {}
}

file_reports = []

def should_skip_line(line: str) -> bool:
    """Check if a line should be skipped (comments, strings, etc.)"""
    stripped = line.strip()
    # Skip comments
    if stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
        return True
    # Skip import/export statements
    if stripped.startswith('import ') or stripped.startswith('export '):
        return True
    return False

def fix_array_methods(content: str) -> Tuple[str, Dict[str, int]]:
    """Fix array method calls to use optional chaining"""
    changes = {}
    methods = ['map', 'filter', 'find', 'forEach', 'some', 'every', 'reduce',
               'includes', 'indexOf', 'slice', 'join', 'split', 'sort', 'reverse',
               'concat', 'push', 'pop', 'shift', 'unshift', 'findIndex', 'flat',
               'flatMap', 'reduce']

    lines = content.split('\n')
    modified_lines = []

    for line in lines:
        if should_skip_line(line):
            modified_lines.append(line)
            continue

        original_line = line

        for method in methods:
            # Pattern: word.method( where word is not already optional-chained
            # Match: identifier.method( but not ?.method( or ".method("
            pattern = r'(\w+)\.(' + re.escape(method) + r')\('

            # Check if already has optional chaining
            if f'?.{method}(' in line:
                continue

            matches = re.findall(pattern, line)
            if matches:
                # Only replace if it's not in a string literal
                if "'" + method + "'" not in line and '"' + method + '"' not in line:
                    new_line = re.sub(pattern, r'\1?.\2(', line)
                    if new_line != line:
                        line = new_line
                        key = f'.{method}( → ?.{method}('
                        changes[key] = changes.get(key, 0) + len(matches)

        modified_lines.append(line)

    return '\n'.join(modified_lines), changes

def fix_string_methods(content: str) -> Tuple[str, Dict[str, int]]:
    """Fix string method calls to use optional chaining"""
    changes = {}
    methods = ['toLowerCase', 'toUpperCase', 'trim', 'charAt', 'substring',
               'replace', 'startsWith', 'endsWith', 'padStart', 'padEnd',
               'trimStart', 'trimEnd', 'match', 'search']

    lines = content.split('\n')
    modified_lines = []

    for line in lines:
        if should_skip_line(line):
            modified_lines.append(line)
            continue

        original_line = line

        for method in methods:
            pattern = r'(\w+)\.(' + re.escape(method) + r')\('

            if f'?.{method}(' in line:
                continue

            matches = re.findall(pattern, line)
            if matches:
                if "'" + method + "'" not in line and '"' + method + '"' not in line:
                    new_line = re.sub(pattern, r'\1?.\2(', line)
                    if new_line != line:
                        line = new_line
                        key = f'.{method}( → ?.{method}('
                        changes[key] = changes.get(key, 0) + len(matches)

        modified_lines.append(line)

    return '\n'.join(modified_lines), changes

def fix_length_property(content: str) -> Tuple[str, Dict[str, int]]:
    """Fix .length property access to use optional chaining"""
    changes = {}

    lines = content.split('\n')
    modified_lines = []

    for line in lines:
        if should_skip_line(line):
            modified_lines.append(line)
            continue

        # Pattern: identifier.length but not ?.length
        if '.length' in line and '?.length' not in line:
            # Be conservative - only fix clear cases
            pattern = r'(\w+)\.length\b'
            matches = re.findall(pattern, line)

            if matches:
                # Don't replace if it's in a comment or string
                if '//' not in line[:line.find('.length')] if '.length' in line else True:
                    new_line = re.sub(pattern, r'\1?.length', line)
                    if new_line != line:
                        line = new_line
                        key = '.length → ?.length'
                        changes[key] = changes.get(key, 0) + len(matches)

        modified_lines.append(line)

    return '\n'.join(modified_lines), changes

def process_file(file_path: Path) -> Dict:
    """Process a single file and return results"""
    global stats

    result = {
        'path': str(file_path.relative_to(SRC_DIR)),
        'status': 'unchanged',
        'changes': {},
        'total_changes': 0,
        'error': None
    }

    try:
        # Read file
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()

        # Apply fixes
        content = original_content
        all_changes = {}

        # Fix array methods
        content, changes1 = fix_array_methods(content)
        all_changes.update(changes1)

        # Fix string methods
        content, changes2 = fix_string_methods(content)
        all_changes.update(changes2)

        # Fix length property
        content, changes3 = fix_length_property(content)
        all_changes.update(changes3)

        # Calculate total changes
        total_changes = sum(all_changes.values())

        if total_changes > 0 and content != original_content:
            # Write modified content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

            result['status'] = 'modified'
            result['changes'] = all_changes
            result['total_changes'] = total_changes
            stats['files_modified'] += 1
            stats['total_changes'] += total_changes

            # Update pattern counts
            for pattern, count in all_changes.items():
                stats['pattern_counts'][pattern] = stats['pattern_counts'].get(pattern, 0) + count
        else:
            stats['files_unchanged'] += 1

    except Exception as e:
        result['status'] = 'error'
        result['error'] = str(e)
        stats['files_with_errors'] += 1

    return result

def format_report(result: Dict) -> str:
    """Format a file result for display"""
    if result['status'] == 'modified':
        lines = [f"✓ {result['path']}: {result['total_changes']} changes"]
        for pattern, count in sorted(result['changes'].items()):
            lines.append(f"  - {pattern}: {count}")
        return '\n'.join(lines)
    elif result['status'] == 'error':
        return f"✗ {result['path']}: ERROR - {result['error']}"
    else:
        return f"○ {result['path']}: No changes needed"

def main():
    """Main processing function"""
    print("=" * 80)
    print("OPTIONAL CHAINING FIX SCRIPT")
    print("=" * 80)
    print(f"\nProcessing TypeScript files in: {SRC_DIR}\n")

    # Find all TypeScript files
    ts_files = sorted(list(SRC_DIR.rglob("*.ts")) + list(SRC_DIR.rglob("*.tsx")))
    stats['total_files'] = len(ts_files)

    print(f"Found {len(ts_files)} TypeScript files\n")
    print("Processing...")
    print("-" * 80)

    # Process each file
    for file_path in ts_files:
        result = process_file(file_path)
        file_reports.append(result)

        # Print progress
        report = format_report(result)
        print(report)

    # Print summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total files processed:  {stats['total_files']}")
    print(f"Files modified:         {stats['files_modified']}")
    print(f"Files unchanged:        {stats['files_unchanged']}")
    print(f"Files with errors:      {stats['files_with_errors']}")
    print(f"Total changes applied:  {stats['total_changes']}")

    if stats['pattern_counts']:
        print("\nChanges by pattern:")
        for pattern, count in sorted(stats['pattern_counts'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {pattern}: {count}")

    # Write detailed log
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        f.write("OPTIONAL CHAINING FIX REPORT\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"Date: {Path(__file__).stat().st_mtime}\n")
        f.write(f"Source directory: {SRC_DIR}\n\n")

        f.write("FILE RESULTS:\n")
        f.write("-" * 80 + "\n")
        for result in file_reports:
            f.write(format_report(result) + "\n")

        f.write("\n" + "=" * 80 + "\n")
        f.write("SUMMARY\n")
        f.write("=" * 80 + "\n")
        f.write(f"Total files processed:  {stats['total_files']}\n")
        f.write(f"Files modified:         {stats['files_modified']}\n")
        f.write(f"Files unchanged:        {stats['files_unchanged']}\n")
        f.write(f"Files with errors:      {stats['files_with_errors']}\n")
        f.write(f"Total changes applied:  {stats['total_changes']}\n")

        if stats['pattern_counts']:
            f.write("\nChanges by pattern:\n")
            for pattern, count in sorted(stats['pattern_counts'].items(), key=lambda x: x[1], reverse=True):
                f.write(f"  {pattern}: {count}\n")

    print(f"\nDetailed report saved to: {LOG_FILE}")
    print("=" * 80)

if __name__ == "__main__":
    main()
