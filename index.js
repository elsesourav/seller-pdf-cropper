const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const path = require("path");
const app = express();
const PORT = 3000;

// Set up Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to serve static files
app.use(express.static("public"));

// Render the upload form
app.get("/", (req, res) => {
   res.sendFile(path.join(__dirname, "public", "index.html"));
});

let filePath;

// Handle PDF upload and cropping
app.post("/upload", upload.single("pdf"), async (req, res) => {
   try {
      const inputPdfBytes = req.file.buffer;
      const pdfDoc = await PDFDocument.load(inputPdfBytes);

      const bottom = 460;
      const left = 188;
      const newWidth = 219;
      const newHeight = 356;

      // Adjusting each page for cropping
      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
         const page = pdfDoc.getPage(i);
         // const { width, height } = page.getSize();

         page.setCropBox(left, bottom, newWidth, newHeight);
      }

      const pdfBytes = await pdfDoc.save();

      const desktopPath = path.join(require("os").homedir(), "Desktop");
      const outputFileName = req.file.originalname;
      const outputFilePath = path.join(desktopPath, outputFileName);

      fs.writeFileSync(outputFilePath, pdfBytes);

      filePath = outputFilePath;

      console.log(`Cropped PDF saved as ${outputFilePath}`);

      res.send(`
         <!DOCTYPE html>
         <html lang="en">
         <head>
             <meta charset="UTF-8" />
             <meta name="viewport" content="width=device-width, initial-scale=1.0" />
             <title>Cropped PDF Ready</title>
             <style>
                 body {
                     font-family: Arial, sans-serif;
                     background-color: #f4f4f4;
                     margin: 0;
                     padding: 20px;
                     text-align: center;
                 }
                 h1 {
                     color: #2c3e50;
                     margin-bottom: 20px;
                 }
                 p {
                     color: #333;
                     margin-bottom: 20px;
                 }
                 iframe {
                     border: 2px solid #3498db;
                     border-radius: 8px;
                     box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                 }
                 a {
                     display: inline-block;
                     margin-top: 20px;
                     padding: 10px 20px;
                     background-color: #27ae60;
                     color: white;
                     border-radius: 5px;
                     text-decoration: none;
                     transition: background-color 0.3s;
                 }
                 a:hover {
                     background-color: #219653;
                 }
                 footer {
                     margin-top: 40px;
                     font-size: 14px;
                     color: #999;
                 }
             </style>
         </head>
         <body>
         
             <h1>Cropped PDF Ready</h1>
             <p>Your cropped PDF has been created.</p>
             <iframe src="/${outputFileName}" width="360" height="500"></iframe>
             <br>
             <a href="/">Go Back</a>
             
             <footer>
                 &copy; 2024 SouravBarui. All Rights Reserved.
             </footer>
         
         </body>
         </html>
      `);
   } catch (err) {
      console.error(err);
      res.status(500).send("Error cropping PDF.");
   }
});

app.get("/:filename", (req, res) => {
   res.set({
      "Content-Disposition": "inline", // This allows the PDF to open in the browser
      "Content-Type": "application/pdf",
   });
   res.sendFile(filePath, (err) => {
      if (err) {
         console.error(err);
         res.status(404).send("File not found.");
      }
   });
});

// Start the server
app.listen(PORT, () => {
   console.log(`Server running at http://localhost:${PORT}`);
});
