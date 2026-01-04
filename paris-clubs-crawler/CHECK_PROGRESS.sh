#!/bin/bash
# Quick progress check script

cd "/Users/sofianeboukhalfa/Documents/business sites/Parc ton gosse/paris-clubs-crawler"

echo "============================================================"
echo "ENRICHMENT PROGRESS CHECK"
echo "============================================================"
echo ""

# Check if process is running
if ps aux | grep -E "python.*enrich_for_website" | grep -v grep > /dev/null; then
    echo "✅ Process is RUNNING"
    echo ""
    ps aux | grep -E "python.*enrich_for_website" | grep -v grep | awk '{print "  PID: " $2 " | Started: " $9}'
else
    echo "❌ Process is NOT running"
fi

echo ""
echo "---"

# Check sheet progress
python3 -c "
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath('.')))
from dotenv import load_dotenv
load_dotenv()
from src.storage.sheets_manager import SheetsManager

sm = SheetsManager(os.getenv('SPREADSHEET_ID'), 'Activities Enriched')
all_values = sm.worksheet.get_all_values()
processed = len(all_values) - 1
total = 3010
remaining = total - processed
pct = (processed / total * 100) if total > 0 else 0

print(f'📊 Sheet Progress:')
print(f'   Processed: {processed}/{total} ({pct:.1f}%)')
print(f'   Remaining: {remaining}')
"

echo ""
echo "---"

# Check latest log activity
echo "📝 Latest Activity:"
if [ -f /tmp/enrichment_resume_1857.log ]; then
    tail -n 3 /tmp/enrichment_resume_1857.log | grep "Processing:" | tail -n 1
elif [ -f /tmp/enrichment_resume.log ]; then
    tail -n 3 /tmp/enrichment_resume.log | grep "Processing:" | tail -n 1
elif [ -f /tmp/enrichment_full.log ]; then
    tail -n 3 /tmp/enrichment_full.log | grep "Processing:" | tail -n 1
fi

echo ""
echo "============================================================"
