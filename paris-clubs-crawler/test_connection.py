#!/usr/bin/env python3
"""
Test script to verify Google Sheets connection
"""
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.storage.sheets_manager import SheetsManager
from config.settings import WORKSHEET_NAME

def test_connection():
    """Test connection to Google Sheets"""
    print("=" * 60)
    print("Testing Google Sheets Connection")
    print("=" * 60)
    print()
    
    spreadsheet_id = os.getenv('SPREADSHEET_ID')
    worksheet_name = os.getenv('WORKSHEET_NAME', WORKSHEET_NAME)
    
    if not spreadsheet_id:
        print("❌ SPREADSHEET_ID not found in .env file")
        print()
        print("Please add SPREADSHEET_ID to your .env file")
        return False
    
    print(f"📊 Spreadsheet ID: {spreadsheet_id}")
    print(f"📋 Worksheet Name: {worksheet_name}")
    print()
    
    try:
        print("🔌 Connecting to Google Sheets...")
        sheets_manager = SheetsManager(spreadsheet_id, worksheet_name)
        print("✅ Connection successful!")
        print()
        
        print("📝 Initializing worksheet...")
        sheets_manager.initialize_sheet()
        print("✅ Worksheet initialized!")
        print()
        
        print("=" * 60)
        print("✅ ALL CHECKS PASSED!")
        print("=" * 60)
        print()
        print("🎉 Your crawler is ready to use!")
        print()
        print("Next step: Run the crawler:")
        print("  python main.py")
        print()
        
        return True
        
    except FileNotFoundError as e:
        print("❌ Credentials file not found")
        print()
        print(f"Error: {e}")
        print()
        print("Make sure google_credentials.json is in the config/ folder")
        return False
        
    except Exception as e:
        print("❌ Connection failed")
        print()
        print(f"Error: {e}")
        print()
        print("Troubleshooting:")
        print("  1. Verify credentials file exists: config/google_credentials.json")
        print("  2. Check that you shared the sheet with the service account email")
        print("  3. Make sure the service account has 'Editor' permission")
        print("  4. Verify SPREADSHEET_ID in .env is correct")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
