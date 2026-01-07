#!/bin/bash

# Script to help find and list all alert() and confirm() calls that need replacement
# This script doesn't auto-replace to avoid breaking functionality

echo "======================================"
echo "Alert & Confirm Replacement Helper"
echo "======================================"
echo ""

echo "Files with alert() calls:"
echo "------------------------"
grep -rl "alert(" src --include="*.tsx" --include="*.ts" | grep -v "showAlert" | while read file; do
    count=$(grep -c "alert(" "$file" 2>/dev/null || echo "0")
    echo "  $file ($count occurrences)"
done

echo ""
echo "Files with confirm() calls:"
echo "--------------------------"
grep -rl "confirm(" src --include="*.tsx" --include="*.ts" | grep -v "showConfirm" | while read file; do
    count=$(grep -c "confirm(" "$file" 2>/dev/null || echo "0")
    echo "  $file ($count occurrences)"
done

echo ""
echo "Summary:"
echo "--------"
alert_count=$(grep -r "alert(" src --include="*.tsx" --include="*.ts" | grep -v "showAlert" | wc -l)
confirm_count=$(grep -r "confirm(" src --include="*.tsx" --include="*.ts" | grep -v "showConfirm" | wc -l)
echo "Total alert() calls: $alert_count"
echo "Total confirm() calls: $confirm_count"
echo ""

echo "Next Steps:"
echo "----------"
echo "1. Open each file listed above"
echo "2. Import useNotification hook:"
echo "   import { useNotification } from '../../contexts/NotificationContext';"
echo "3. Use the hook in component:"
echo "   const { showAlert, showConfirm } = useNotification();"
echo "4. Replace alert() with showAlert(message, 'warning')"
echo "5. Replace confirm() with await showConfirm(message)"
echo ""
echo "See MIGRATION_GUIDE.md for detailed examples!"
