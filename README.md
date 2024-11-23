# Seller PDF Cropper

A web application that helps sellers crop PDF files into specific dimensions for labels and bills. The application provides an easy-to-use interface for uploading PDFs and automatically crops them based on predefined dimensions.

## 🌐 Live On
[https://seller-pdf-cropper.onrender.com/](https://seller-pdf-cropper.onrender.com/)

## ✨ Features

- PDF file upload with preview
- Two cropping options:
  - Label (219x356 pixels)
  - Bill (Full width with 30px margins, 390px height)
- Dark/Light mode support
- Responsive design
- Instant preview after cropping
- File size limit: 10MB

## 🚀 Usage

1. Visit [https://seller-pdf-cropper.onrender.com/](https://seller-pdf-cropper.onrender.com/)
2. Click "Choose PDF" to select your PDF file
3. Select crop type:
   - Label: For shipping labels
   - Bill: For invoices/bills
4. Click "Upload and Crop"
5. View and download the cropped PDF

## 🛠️ Technical Details

### Built With
- Node.js
- Express.js
- PDF-lib
- Multer
- HTML/CSS/JavaScript

### Crop Dimensions
- Label (Type 1):
  ```javascript
  {
      bottom: 460,
      left: 188,
      width: 219,
      height: 356
  }
  ```
- Bill (Type 2):
  ```javascript
  {
      bottom: 70,
      left: 30,
      width: [dynamic],
      height: 390
  }
  ```

## 🔒 Limitations
- Maximum file size: 10MB
- Supports PDF files only
- Single page processing at a time

## 👨‍💻 Developer
Developed by Sourav Barui

## 📝 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.