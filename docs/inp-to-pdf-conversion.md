# InPage (`.inp`) → PDF Conversion Guide

> For Ilm o Irfan book publishing pipeline  
> Goal: produce PDFs for Supabase Storage + `react-native-pdf` without losing Nastaliq / RTL layout

InPage `.inp` files are proprietary. The app cannot open them. Convert masters to PDF before upload.

This doc covers two practical bulk approaches:

- **Option A** — CoolUtils Total Doc Converter (CLI / batch) — best for volume + scripts  
- **Option B** — Automate InPage print-to-PDF — best for maximum layout fidelity  

Keep every `.inp` as the permanent master. PDFs are delivery copies only.

---

## Shared rules (both options)

1. Work on a **Windows** machine (InPage is Windows-first; Total Doc Converter is desktop Windows).
2. Never overwrite or delete `.inp` masters.
3. Use a clear folder layout, for example:

```text
D:\IlmBooks\
├── masters\inp\          ← original .inp only
├── export\pdf\           ← converted PDFs
├── export\qa-fail\       ← PDFs that failed visual QA
└── scripts\              ← bat / ps1 / ahk helpers
```

4. After conversion, run the **QA checklist** before uploading to Supabase.
5. Upload only PDFs to the `pdfs` Storage bucket; store the Storage path on the `books` row.

### QA checklist (required)

Open the PDF and spot-check first, middle, and last pages (plus any image/table pages):

- [ ] Nastaliq text renders (no boxes / missing glyphs)
- [ ] RTL reading order looks correct
- [ ] Margins not clipped; no overlapping text
- [ ] Images / tables present and aligned
- [ ] Page count matches the InPage document
- [ ] File size reasonable for mobile (prefer ~5–20 MB when possible)
- [ ] Opens cleanly in a normal PDF viewer (and later in the app reader)

If QA fails → move PDF to `export\qa-fail\` and re-export that title with **Option B** (InPage native print).

---

## Option A — Total Doc Converter (bulk + scripts)

### When to use

- You have **many** `.inp` files (dozens to hundreds)
- You want folder batch conversion and/or scheduled/scripted runs
- You can accept a short pilot QA period before trusting the full library

### What you need

| Item | Notes |
| --- | --- |
| Windows PC | Required |
| [CoolUtils Total Doc Converter](https://www.coolutils.com/TotalDocConverter) | Desktop app; supports InPage `.inp`; CLI available |
| Trial first | Convert ~10 representative books before buying / full run |

Total Doc Converter advertises InPage support, folder batch mode, and command-line execution. Exact installer paths and flag names can vary by version — generate or copy the CLI string from the app GUI when possible.

### Setup

1. Install Total Doc Converter.
2. Confirm `.inp` appears in supported input types.
3. Put masters in `D:\IlmBooks\masters\inp\`.
4. Create empty output folder `D:\IlmBooks\export\pdf\`.
5. Run a **pilot** on 10 books that cover:
   - simple text
   - dense Nastaliq
   - multi-column / complex layout
   - image-heavy pages
6. Only if pilot QA passes → convert the full library.

### CLI batch example

Typical pattern (adjust executable path / flags to match your install; prefer the “copy command line” feature from the GUI if available):

```bat
docconverter.exe /S "D:\IlmBooks\masters\inp\*.inp" /F PDF /O "D:\IlmBooks\export\pdf"
```

### Ready-to-use batch script

Save as `D:\IlmBooks\scripts\convert-inp-option-a.bat`:

```bat
@echo off
setlocal

set "IN_DIR=D:\IlmBooks\masters\inp"
set "OUT_DIR=D:\IlmBooks\export\pdf"
set "DOC_CONVERTER=C:\Program Files\CoolUtils\TotalDocConverter\docconverter.exe"

if not exist "%DOC_CONVERTER%" (
  echo ERROR: Total Doc Converter not found at:
  echo   %DOC_CONVERTER%
  echo Update DOC_CONVERTER path in this script.
  exit /b 1
)

if not exist "%IN_DIR%" (
  echo ERROR: Input folder missing: %IN_DIR%
  exit /b 1
)

if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

echo Converting all .inp files...
echo From: %IN_DIR%
echo To:   %OUT_DIR%
echo.

"%DOC_CONVERTER%" /S "%IN_DIR%\*.inp" /F PDF /O "%OUT_DIR%"
set "ERR=%ERRORLEVEL%"

echo.
if "%ERR%"=="0" (
  echo Conversion finished. Run QA before uploading to Supabase.
) else (
  echo Conversion exited with code %ERR%. Check the converter log / GUI.
)

exit /b %ERR%
```

### PowerShell wrapper (optional)

Save as `D:\IlmBooks\scripts\convert-inp-option-a.ps1`:

```powershell
$InDir = "D:\IlmBooks\masters\inp"
$OutDir = "D:\IlmBooks\export\pdf"
$Converter = "C:\Program Files\CoolUtils\TotalDocConverter\docconverter.exe"

if (-not (Test-Path $Converter)) {
  throw "Total Doc Converter not found: $Converter"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$args = @(
  "/S", "$InDir\*.inp",
  "/F", "PDF",
  "/O", $OutDir
)

Write-Host "Starting Option A conversion..."
$p = Start-Process -FilePath $Converter -ArgumentList $args -Wait -PassThru

if ($p.ExitCode -ne 0) {
  throw "Converter failed with exit code $($p.ExitCode)"
}

Write-Host "Done. QA PDFs in $OutDir before upload."
```

Run:

```powershell
powershell -ExecutionPolicy Bypass -File "D:\IlmBooks\scripts\convert-inp-option-a.ps1"
```

### After Option A

1. Spot-check every book (or at least pilot set + random sample of full run).
2. Move failures to `export\qa-fail\`.
3. Re-do failures with **Option B**.
4. Optionally compress large PDFs, then upload.

### Option A pros / cons

| Pros | Cons |
| --- | --- |
| True bulk / folder conversion | Third-party renderer may differ from InPage on edge layouts |
| Scriptable / schedulable | Must verify CLI path/flags for your version |
| Offline; files stay on your PC | License cost after trial |
| Fast for large libraries | Not a substitute for QA |

---

## Option B — Automate InPage print-to-PDF (highest fidelity)

### When to use

- Layout quality matters more than speed (flagship books, dense Nastaliq)
- Option A QA fails on some titles
- Catalog is smaller, or only failures need the “perfect” path

### Why this is the fidelity gold standard

PDF is generated by **InPage’s own layout engine** (via Print / Save as PDF). That is the closest match to what you see while editing the `.inp`.

InPage does **not** expose a reliable public API for headless conversion, so bulk Option B means **UI / print automation** on a real Windows desktop session.

### What you need

| Item | Notes |
| --- | --- |
| **Urdu InPage** installed | Same version you use to author books |
| PDF printer | Prefer a printer that supports **auto-name / silent save** (e.g. Win2PDF or similar). Microsoft Print to PDF works manually but is awkward to fully automate (save dialog). |
| Automation helper | AutoHotkey (common), Power Automate, or UI Automation |
| Interactive Windows session | Do not expect this to run cleanly as a headless Windows service |

### Manual baseline (do this once per book if not automating)

1. Open the `.inp` in InPage.
2. Confirm page size, margins, fonts look correct.
3. **File → Print** (or Save as PDF if your InPage build has it).
4. Choose your PDF printer.
5. Save to `D:\IlmBooks\export\pdf\<same-base-name>.pdf`.
6. Close the document.
7. Run QA checklist.

### Automation pattern (recommended)

High-level loop for each `.inp`:

```text
for each file in masters\inp\*.inp:
  1. Launch / focus InPage
  2. Open the .inp
  3. Wait until document is ready
  4. Send Print to the PDF printer (silent / auto-name)
  5. Wait until PDF appears in export\pdf\
  6. Close document (no save of .inp changes)
  7. Log success/failure
  8. Next file
```

### PDF printer setup tips

- Set default output folder to `D:\IlmBooks\export\pdf\`
- Enable **auto-name from document title / source filename**
- Disable prompts where the driver allows
- Test one file end-to-end before looping a folder

### Example AutoHotkey sketch (illustrative)

> Treat this as a **starting template**. Exact menus, shortcuts, and window titles depend on your InPage version and PDF printer. Adjust sleep timings after testing on your machine.

Save as `D:\IlmBooks\scripts\convert-inp-option-b.ahk` and adapt:

```ahk
; Option B sketch — InPage print-to-PDF automation
; Edit paths, window titles, and hotkeys for your environment.

inDir  := "D:\IlmBooks\masters\inp"
outDir := "D:\IlmBooks\export\pdf"
inpage := "C:\Program Files\InPage\InPage.exe"  ; update to real path

; Example: your PDF printer's auto-save should already target outDir

Loop, Files, %inDir%\*.inp
{
    src := A_LoopFileFullPath
    base := A_LoopFileName
    pdf := outDir "\" RegExReplace(base, "i)\.inp$", ".pdf")

    if FileExist(pdf)
    {
        ; Skip already converted; remove this block to force re-export
        continue
    }

    Run, "%inpage%" "%src%"
    WinWait, ahk_exe InPage.exe,, 30
    if ErrorLevel
    {
        FileAppend, FAIL open %src%`n, %outDir%\option-b-log.txt
        continue
    }

    Sleep, 3000
    WinActivate, ahk_exe InPage.exe

    ; Ctrl+P = Print in many apps — confirm in your InPage
    Send, ^p
    Sleep, 1500

    ; If Print dialog appears: select PDF printer, confirm
    ; These keystrokes are machine-specific — calibrate once:
    ; Send, {Enter}

    ; Wait for PDF file (timeout ~60s)
    waited := 0
    while (waited < 60000 && !FileExist(pdf))
    {
        Sleep, 500
        waited += 500
    }

    if FileExist(pdf)
        FileAppend, OK %pdf%`n, %outDir%\option-b-log.txt
    else
        FileAppend, FAIL pdf-missing %src%`n, %outDir%\option-b-log.txt

    ; Close document without saving .inp edits
    WinActivate, ahk_exe InPage.exe
    Send, ^w
    Sleep, 800
    ; If "Save changes?" appears, send N
    Send, n
    Sleep, 500
}

MsgBox, Option B batch finished. Check option-b-log.txt and run QA.
```

### Safer semi-automated Option B

If full UI automation is too brittle:

1. Open each `.inp` yourself.
2. Use a hotkey that only triggers **Print → PDF printer → auto-save**.
3. Still saves dozens of clicks while keeping you in control.

### Option B pros / cons

| Pros | Cons |
| --- | --- |
| Highest layout fidelity | Slower than Option A |
| Uses real InPage rendering | No official headless API |
| Best rescue path when batch tools fail | UI automation is brittle across versions |
| Ideal for flagship / complex books | Needs an attended Windows desktop |

---

## Which option should you use?

| Situation | Choose |
| --- | --- |
| Large library, first mass migration | **Option A** (pilot → full run → QA) |
| A/B failures or premium/complex books | **Option B** |
| Small catalog (&lt; ~30 books) | **Option B manual** is often enough |
| Ongoing publishing workflow | Option A for draft bulk; Option B for final “gold” PDFs if needed |

### Recommended hybrid (best overall)

```text
1. Option A — convert entire masters\inp folder
2. QA all (or sample + risky titles)
3. Option B — only re-export qa-fail titles
4. Compress if needed
5. Upload PDFs to Supabase Storage
```

---

## After conversion (app pipeline)

1. Final PDF name should be stable, e.g. `book-slug.pdf` or `{book_id}.pdf`.
2. Upload to Supabase Storage bucket `pdfs` (private).
3. Set `books.pdf_path` to that object path.
4. Optionally set `books.file_size_bytes` and `books.page_count`.
5. App continues to use signed URL → device download → `react-native-pdf`.

Do **not** upload `.inp` to the mobile app stack.

---

## Quick comparison

| | Option A — Total Doc Converter | Option B — InPage print automation |
| --- | --- | --- |
| Speed | Fast | Slow |
| Scripting | Strong CLI | UI automation / attended |
| Fidelity | Good if QA passes | Best |
| Setup difficulty | Medium | Higher |
| Best for | Bulk library | Perfect / rescue exports |
| Risk | Layout mismatches on edge cases | Fragile hotkeys / dialogs |

---

## Summary

- **Option A:** install Total Doc Converter → point it at `masters\inp\*.inp` → CLI/batch to `export\pdf\` → QA.  
- **Option B:** open in InPage → print to a silent PDF printer → automate the loop only after one-file calibration → QA.  
- **Best practice:** A for volume, B for failures/flagship, always keep `.inp` masters, never skip visual QA before Supabase upload.
