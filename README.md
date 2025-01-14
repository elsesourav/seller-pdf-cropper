# PDF Scanner and Cropper

A Node.js web application for processing and cropping PDF files, specifically designed for handling seller bills and documents. The application supports automatic text extraction, dimension-based cropping, and product information management.

## Visit

-  [seller-pdf-cropper-production.up.railway.app](seller-pdf-cropper-production.up.railway.app)
-  [https://seller-pdf-cropper.onrender.com/](https://seller-pdf-cropper.onrender.com/)


## Features

- PDF file upload and processing
- Automatic text extraction from PDFs
- Dimension-based PDF cropping
- Product information management via JSON
- Support for multiple crop types (Type 1 and Type 2)
- Real-time PDF processing
- File size limit of 10MB

## Prerequisites

- Node.js (v16.20 or higher)
- npm (Node Package Manager)

## Dependencies

- express: ^4.21.1 - Web application framework
- multer: ^1.4.5-lts.1 - File upload handling
- pdf-lib: ^1.17.1 - PDF manipulation
- pdfjs-dist: ^3.11.174 - PDF processing and text extraction

## Installation

1. Clone the repository:
```bash
git clone https://github.com/elsesourav/seller-pdf-cropper.git
cd seller-pdf-cropper
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your web browser and navigate to:
http://localhost:3000
```

3. Upload a PDF file and select the crop type
4. The application will process the PDF and return the cropped version

## API Endpoints

- `GET /` - Serves the main application page
- `POST /upload` - Handles PDF file uploads and processing
- `GET /:filename` - Serves processed PDF files

## Configuration

- The application uses `products.json` for managing product information
- Default port: 3000
- Maximum file upload size: 10MB

## Project Structure

```
seller-pdf-cropper/
├── public/           # Static files
├── index.js         # Main application file
├── products.json    # Product information
├── package.json     # Project dependencies
└── README.md        # Documentation
```

## License

ISC License
