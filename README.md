# PDF Scanner and Cropper (Client-Only Version)

Created and maintained by Sourav Barui

## Overview
This is a client-side only version of the PDF Scanner and Cropper application. It allows you to crop PDFs, add serial numbers, and display product names directly in your browser without requiring a server. The application features a professional PDF viewer with light/dark mode support and advanced text measurement capabilities for optimal document processing.

## How to Use

1. Simply open the `index.html` file in your web browser
2. Upload a PDF file using the "Choose PDF" button
3. Select the crop type (Label or Bill)
4. Configure options:
   - Show Serial Number: Adds sequential numbering to each page
   - Start From: Sets the starting number for serial numbering
   - Show Product Name: Displays product information on each page (only for Label type)
5. Click "Process PDF" to generate and download the cropped PDF

## Features

- Crop PDFs to predefined dimensions with precise accuracy
- Add serial numbers to pages with optimized font sizing
- Extract and display product information with enhanced text measurement
- Process PDFs entirely in the browser - no server required
- Automatic download of processed PDFs
- Professional PDF viewer with light/dark mode support
- Responsive design with dynamic iframe sizing
- Canvas-based text measurement for perfect font scaling
- Improved UI/UX with modern styling

## Technical Details

- Uses pdf-lib for PDF manipulation
- Uses PDF.js for text extraction and rendering
- Uses download.js for file saving
- All processing happens in the browser
- User preferences saved in localStorage
- Advanced canvas-based text measurement system
- Dynamic iframe sizing for viewer integration
- Session storage for secure PDF data transfer
- Optimized rendering with WebGL acceleration

## Dependencies

- pdf-lib: ^1.17.1 - PDF manipulation
- pdfjs-dist: ^3.11.174 - PDF processing and text extraction
- downloadjs: ^1.4.7 - File download handling

## Project Structure

```
seller-pdf-cropper/
├── index.html     # Main application page
├── viewer.html    # PDF viewer page
├── css/
│   ├── index.css  # Main application styles
│   └── viewer.css # PDF viewer styles
├── js/
│   ├── app.js     # Main application logic
│   ├── utils.js   # Utility functions for PDF processing
│   ├── viewer.js  # PDF viewer logic
│   └── libs/      # JavaScript libraries
├── src/           # Static assets
├── changes/       # SKU mapping files
└── README.md      # Documentation
```

## Online Access
You can access the application directly through your web browser at: [https://elsesourav.github.io/seller-pdf-corpper](https://elsesourav.github.io/seller-pdf-corpper)

## License
This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 Sourav Barui. All rights reserved.

Permission to use, copy, modify, and distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.