# CSV Import/Export Guide

## Overview

The Learn2Lead platform supports CSV import/export for class logs, enabling seamless integration with Excel for archival and accounting purposes. The web platform serves as the primary system for real-time class tracking, with Excel as a secondary backup system.

## Class Number Format

Each class record has a unique **Class Number** in the format:

```
{student_initials}-{tutor_initials}-{YYYYMMDD}-{sequence}
```

### Examples:
- `SM-JD-20241119-1` - Sarah Miller with John Doe on November 19, 2024 (first class that day)
- `SM-JD-20241119-2` - Sarah Miller with John Doe on November 19, 2024 (second class that day)
- `MB-JS-20241120-1` - Michael Brown with Jane Smith on November 20, 2024

### Auto-Generation

**You can leave the Class Number column blank when importing** - the system will automatically generate a unique ID based on:
- Student name initials
- Tutor name initials
- Class date
- Sequence number for that day

## CSV File Format

Your CSV file must include these columns in this exact order:

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| Class Number | Unique identifier | No (auto-generates if blank) | `SM-JD-20241119-1` |
| Tutor Name | Full name of tutor | Yes | `John Doe` |
| Student Name | Full name of student | Yes | `Sarah Miller` |
| Date | Class date | Yes | `11/19/2024` |
| Day | Day of week | No | `Tuesday` |
| Time (CST) | Start time | Yes | `14:00` or `2:00 PM` |
| Time (hrs) | Duration in hours | Yes | `1` or `1.5` |
| Subject | Subject taught | Yes | `Math` |
| Content | Class content/topics | No | `Algebra review` |
| HW | Homework assigned | No | `Practice problems 1-10` |
| Class Cost | Total class cost | No | `50` |
| Tutor Cost | Tutor payment amount | No | `25` |
| Student Payment | Payment date or status | No | `11/20/24` or blank |
| Tutor Payment | Payment date or status | No | `11/21/24` or blank |
| Additional Info | Notes and comments | No | `Makeup class` |

### Date Formats

**Class Date**: `M/D/YYYY` or `MM/DD/YYYY` (e.g., `11/19/2024` or `1/5/2024`)

**Payment Dates**: `M/D/YY` or `MM/DD/YY` (e.g., `11/20/24` or `1/5/24`)

## Import Process

### How It Works

The CSV import uses an **upsert** strategy:

1. **Update existing records**: If a Class Number already exists in the database, the system updates that record with the new data from the CSV
2. **Insert new records**: If a Class Number doesn't exist, the system creates a new record
3. **Preserve unlisted records**: Classes in the database but not in the CSV file are kept unchanged

### Steps to Import

1. Navigate to **Admin Dashboard → Logs tab**
2. Click **"Upload CSV"** button
3. Select your CSV file
4. Review the preview of records to be imported
5. Click **"Import"** to process the file
6. The system will report how many records were created/updated

### Tips

- **Leave Class Number blank** for new classes - the system generates unique IDs automatically
- **Include Class Numbers** when updating existing records to prevent duplicates
- **Test first**: Download the test CSV from the Export dialog to verify your format
- **Backup before importing**: Export your current data before large imports

## Export Process

### How to Export

1. Navigate to **Admin Dashboard → Logs tab**
2. Click **"Export CSV"** button
3. (Optional) Set date range filters to export specific periods
4. Click **"Export"** to download the CSV file

### What's Included

The exported CSV contains:
- All class information in the standard column format
- Unique Class Numbers for every record
- Payment dates in `M/D/YY` format
- All notes and additional information

### Use Cases

- **Accounting**: Import into Excel for financial analysis and tax records
- **Archival**: Keep monthly/yearly backups of class logs
- **Reporting**: Create custom reports and charts in Excel
- **Migration**: Transfer data between systems or backup before major changes

## Testing the System

### Download Test CSV

1. Open the **Export CSV dialog**
2. Click **"Download Test CSV"** at the bottom
3. The test file includes:
   - A record with existing Class Number (tests updates)
   - Records with blank Class Numbers (tests auto-generation)
   - New records (tests inserts)

### Round-Trip Testing

1. **Export** your current class logs
2. Make changes in Excel (add new classes, update existing ones)
3. **Import** the modified CSV
4. **Verify** changes in the Class Logs table
5. **Export** again and compare with your Excel file

## Troubleshooting

### Common Issues

**"Invalid date format"**
- Ensure dates are in `M/D/YYYY` format for class dates
- Check that payment dates use `M/D/YY` format

**"Duplicate Class Numbers"**
- Each Class Number must be unique
- If auto-generating, ensure student/tutor names are consistent

**"Missing required columns"**
- Verify your CSV has all required columns in the correct order
- Check that column headers match exactly (case-sensitive)

**"Import creates duplicates"**
- Include the Class Number column to update existing records
- Use exported CSV as a starting point to preserve Class Numbers

### Getting Help

If you encounter issues:
1. Download the test CSV to verify correct format
2. Try exporting current data to see proper formatting
3. Check that your CSV encoding is UTF-8
4. Contact support with the error message and sample CSV row

## Best Practices

### For Regular Use

1. **Web-first approach**: Log classes directly in the web platform for real-time credit tracking
2. **Periodic exports**: Export to Excel monthly for accounting and archival
3. **Consistent naming**: Use consistent tutor/student names for accurate ID generation
4. **Keep Class Numbers**: When re-importing, keep the Class Number column to prevent duplicates

### For Migration

1. **Test with sample data**: Use a small CSV first to verify format
2. **One-time import**: Import historical Excel data once with Class Numbers blank (auto-generate)
3. **Verify and export**: After import, export to get the generated Class Numbers
4. **Update your Excel**: Keep the exported CSV with Class Numbers as your new master template

### For Teams

1. **Single source**: Designate web platform as primary data source
2. **Export for analysis**: Use Excel for reporting and analysis, not primary data entry
3. **Scheduled backups**: Export weekly/monthly backups to Excel
4. **Version control**: Keep dated copies of exported CSVs for audit trails

## Excel Template

You can use this as your Excel template structure:

| Class Number | Tutor Name | Student Name | Date | Day | Time (CST) | Time (hrs) | Subject | Content | HW | Class Cost | Tutor Cost | Student Payment | Tutor Payment | Additional Info |
|--------------|------------|--------------|------|-----|------------|------------|---------|---------|-----|------------|------------|-----------------|---------------|-----------------|
| *leave blank for new* | John Doe | Sarah Miller | 11/19/2024 | Tuesday | 14:00 | 1.5 | Math | Algebra | Problems 1-10 | 50 | 25 | 11/20/24 | 11/21/24 | Regular class |

### Setting Up Your Template

1. Copy the table above into Excel
2. Format Date column as `Date` type
3. Format Time (hrs) column as `Number` with 1 decimal
4. Format Cost columns as `Currency`
5. Save as `.csv` (CSV UTF-8) when ready to import

## Version History

- **v1.0** (Current): Initial CSV import/export with Class Number system, upsert logic, and payment date tracking
