const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { PDFDocument, rgb } = require("pdf-lib");
const path = require("path");
const pdfjsLib = require('pdfjs-dist');
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
    res.send(``);
});


// Add this map to track files
const cropFiles = {
    type1: null,
    type2: null
};

function getFontSize(text, fontSize = 7) {
    const textWidth = fontSize * text.length;
    return textWidth;
}

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
                bottom: 459, // + 40
                left: 188,
                width: 219,
                height: 356, // 58
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

        // Load PDF for text extraction
        const pdfData = new Uint8Array(req.file.buffer);
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdfDocument = await loadingTask.promise;


        const fontSize = 6;
        const size = fontSize * (dimensions.type === 2 ? 1.5 : 1);
        const fontX = dimensions.left + (dimensions.type === 2 ? 10 : dimensions.width - 10);
        const fontY = dimensions.bottom + 1 * (dimensions.type === 2 ? 8 : 1);
        const white = rgb(1, 1, 1);
        const black = rgb(0, 0, 0);

        // Process each page
        for (let i = 0; i < pdfDoc.getPageCount(); i++) {
            const page = pdfDoc.getPage(i);

            // Handle cropping
            page.setCropBox(
                dimensions.left,
                dimensions.bottom,
                dimensions.width,
                dimensions.height
            );

            // Handle text extraction (must use pdfjs-dist)
            const textPage = await pdfDocument.getPage(i + 1);
            const textContent = await textPage.getTextContent();
            const extractedText = textContent.items.map(item => item.str).join("");

            // Process extracted text
            const startIndex = extractedText.indexOf("QTY1");
            const endIndex = extractedText.indexOf("FMP");
            if (startIndex !== -1 && endIndex !== -1) {
                const text = extractedText.substring(startIndex + 4, endIndex);
                const lastNumberMatch = parseInt(text.match(/\d+(?!.*\d)/));
                const sku = text.split("|")[0]?.trim();
                console.log(text.split("|"));
                console.log(sku);
                
                console.log('\n------------------------------------------------------------------------\n');
            }

            if (showSerialNumber) {
                page.drawRectangle({ 
                    x: fontX - size / 4, 
                    y: fontY, 
                    width: getFontSize((i + 1).toString()), 
                    height: size, 
                    color: white,
                });
            }

            // Handle page numbering
            if (showSerialNumber) {
                page.drawText(`${i + 1}`, {
                    x: fontX,
                    y: fontY,
                    size: size,
                    color: black,
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
            <title>CROPPER PDF READY</title>
            <link rel="icon" type="image/png" href="./icon.png">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                }
                :root {
                    color-scheme: light dark;
                }

                body {
                    position: relative;
                    width: 100svw;
                    height: 100svh;
                    font-family: Arial, sans-serif;
                    background-color: light-dark(white, #000);
                    color: light-dark(#222, #ddd);
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 10px;
                }

                h1 {
                    color: #ff8010;
                    text-shadow: 0 0 1px #000;
                    padding: 10px 0;
                }

                p {
                    color: #fff;
                    background: #1b30f2;
                    padding: 3px 6px;
                    border-radius: 5px;
                }

                iframe {
                    border: 2px solid #3445db;
                    border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    background: light-dark(white, #1a1a1a);
                }

                a {
                    display: inline-block;
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
            <h1>CROPPED PDF READY</h1>
            <p>${originalFilename}</p>
            <a href="/">Go Back</a>
            <iframe src="/${outputFileName}" width="360" height="550"></iframe>
            <br>

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
