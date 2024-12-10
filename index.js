const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { PDFDocument, rgb } = require("pdf-lib");
const path = require("path");
const app = express();
const PORT = 3000;

// Set up Multer for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware to serve static files
app.use(express.static("public"));

// Modify the route handler for the index page to include file preview functionality
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PDF Cropper</title>
            <link rel="icon" type="image/png" href="/icon.png">
            <style>
                :root {
                    color-scheme: light dark;
                }

                body {
                    font-family: Arial, sans-serif;
                    background-color: light-dark(white, #000);
                    color: light-dark(#222, #ddd);
                    padding: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                }

                h1 {
                    color: #ff8010;
                    text-shadow: 0 0 1px #000;
                    text-align: center;
                }

                .form-group {
                    margin-bottom: 15px;
                    background: light-dark(white, #1a1a1a);
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                }

                #preview {
                    margin-top: 20px;
                    width: 100%;
                    height: 500px;
                    border: 1px solid light-dark(#ccc, #333);
                    border-radius: 8px;
                    display: none;
                }

                #fileName {
                    margin-top: 5px;
                    color: light-dark(#666, #999);
                    font-size: 0.9em;
                }

                select, button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }

                select {
                    background-color: #3498db;
                    color: white;
                }

                select:hover {
                    background-color: #2980b9;
                }

                button {
                    background-color: #27ae60;
                    color: white;
                    width: 100%;
                    margin-top: 15px;
                }

                button:hover {
                    background-color: #219653;
                }

                footer {
                    margin-top: 20px;
                    font-size: 14px;
                    color: #999;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <h1>PDF Cropper</h1>
            <form action="/upload" method="post" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="pdf">Select PDF:</label>
                    <input type="file" id="pdf" name="pdf" accept="application/pdf" required>
                    <div id="fileName"></div>
                </div>
                <div class="form-group">
                    <label for="cropType">Crop Type:</label>
                    <select name="cropType" id="cropType" required>
                        <option value="type1">Label</option>
                        <option value="type2">Bill</option>
                    </select>
                </div>
                <button type="submit">Upload and Crop</button>
            </form>
            <iframe id="preview" title="PDF Preview"></iframe>

            <script>
                document.getElementById('pdf').addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        // Show file name
                        const fileNameDiv = document.getElementById('fileName');
                        fileNameDiv.textContent = 'Selected file: ' + file.name;
                        
                        // Show preview
                        const preview = document.getElementById('preview');
                        preview.style.display = 'block';
                        preview.src = URL.createObjectURL(file);
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// Add this map to track files
const cropFiles = {
    type1: null,
    type2: null
};

// Handle PDF upload and cropping
app.post("/upload", upload.single("pdf"), async (req, res) => {
    try {
        const inputPdfBytes = req.file.buffer;
        const originalFilename = req.file.originalname;
        
        const pdfDoc = await PDFDocument.load(inputPdfBytes);
        
        const page = pdfDoc.getPage(0);
        const { width } = page.getSize();
        
        // Get crop type from form
        const cropType = req.body.cropType;
        
        // Define crop dimensions for different types
        const sideMargin = 30;
        const cropDimensions = {
            type1: {
                bottom: 459,
                left: 188,
                width: 219,
                height: 356,
                type: 1
            },
            type2: {
                bottom: 70,
                left: sideMargin,
                width: width - 2 * sideMargin,
                height: 390,
                type: 2
            }
        };

        const dimensions = cropDimensions[cropType];
        
        // Get showSerialNumber from form
        const showSerialNumber = req.body.showSerialNumber === 'on';
        
        // Adjusting each page for cropping
        for (let i = 0; i < pdfDoc.getPageCount(); i++) {
            const page = pdfDoc.getPage(i);
            page.setCropBox(
                dimensions.left,
                dimensions.bottom,
                dimensions.width,
                dimensions.height
            );

            // Only draw text if showSerialNumber is checked
            if (showSerialNumber) {
                page.drawText(`${i + 1}`, {
                    x: dimensions.left + (dimensions.type === 2 ? 6 : dimensions.width / 2 - 10),
                    y: dimensions.bottom + 1 * (dimensions.type === 2 ? 4 : 1),
                    size: 6 * dimensions.type,
                    color: rgb(0, 0, 0),
                });
            }
        }

        const pdfBytes = await pdfDoc.save();

        // Save in current directory with fixed names based on crop type
        const outputFileName = `cropped_${cropType}.pdf`;
        const outputFilePath = path.join(__dirname, outputFileName);

        fs.writeFileSync(outputFilePath, pdfBytes);
        cropFiles[cropType] = outputFilePath; // Store the file path

        console.log(`Cropped PDF saved as ${outputFilePath}`);

        res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Cropped PDF Ready</title>
            <link rel="icon" type="image/png" href="./public/icon.png">
            <style>
                :root {
                    color-scheme: light dark;
                }

                body {
                    font-family: Arial, sans-serif;
                    background-color: light-dark(white, #000);
                    color: light-dark(#222, #ddd);
                    margin: 0;
                    padding: 20px;
                    text-align: center;
                }

                h1 {
                    color: #ff8010;
                    text-shadow: 0 0 1px #000;
                    margin-bottom: 20px;
                }

                p {
                    color: light-dark(#333, #ddd);
                    margin-bottom: 20px;
                }

                iframe {
                    border: 2px solid #3498db;
                    border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    background: light-dark(white, #1a1a1a);
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
            <p>Original file: ${originalFilename}</p>
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

// Update the file serving route
app.get("/:filename", (req, res) => {
    const filename = req.params.filename;
    const type = filename.includes('type1') ? 'type1' : 'type2';
    const filePath = cropFiles[type];

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).send("File not found.");
    }

    res.set({
        "Content-Disposition": "inline",
        "Content-Type": "application/pdf",
    });
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(err);
            res.status(404).send("Error sending file.");
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
