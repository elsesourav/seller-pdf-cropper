const white = PDFLib.rgb(1, 1, 1);
const black = PDFLib.rgb(0, 0, 0);
const _CvS_ = document.createElement("canvas");
const _CtX_ = _CvS_.getContext("2d");

function getFontSize(text, fontSize = 7) {
   _CtX_.font = `${fontSize}px Arial`;
   return Math.ceil(_CtX_.measureText(text).width);
}

function getDimensions(width) {
   const sideMargin = 30;
   return {
      type1: {
         bottom: 459, // + 40
         left: 188,
         width: 219,
         height: 356, // 58
         type: 1,
      },
      type2: {
         bottom: 70,
         left: sideMargin,
         width: width - 2 * sideMargin,
         height: 390,
         type: 2,
      },
   };
}

function checkAndUpdateSKU(CHANGES_SKU, text) {
   const sku = text?.trim();
   const splitSku = sku?.split("|");
   const _sku_ = splitSku.length > 1 ? splitSku[0].trim() : sku;

   if (CHANGES_SKU[_sku_]) return CHANGES_SKU[_sku_].NEW_SKU_ID;
   if (_sku_?.split("__").length < 3) return _sku_;

   const noSpaceSku = _sku_?.replace(/\s/g, "");
   if (CHANGES_SKU[noSpaceSku]) return CHANGES_SKU[noSpaceSku].NEW_SKU_ID;
   return _sku_;
}

function getSKUToProductInfo(sku, quantity) {
   const newSku = sku?.split("__");

   const nm = newSku?.[0]?.split("-");
   const newName = nm?.length > 1 ? `*${nm[nm.length - 1]}` : newSku?.[0];

   const type = newSku[2] == "PIECE" ? "P" : newSku[2];

   const quantityAndType = `${newSku[1]} ${type}`;
   const multiple = quantity > 1 ? ` *${quantity}` : "";

   const name = `${newName}  ${quantityAndType}${multiple}`;
   return { name, isMakeable: newSku.length > 2 };
}

function getSKUsToProductInfo(product, quantity, CHANGES_SKU) {
   if (product.length !== quantity.length)
      return { name: "", isMakeable: false };
   const obj = {};

   for (let j = 0; j < product.length; j++) {
      const text = product[j];
      const multi = parseInt(quantity[j]);

      const sku = checkAndUpdateSKU(CHANGES_SKU, text);
      const newSku = sku?.split("__");
      if (newSku.length < 3) return { name: "", isMakeable: false };

      const nm = newSku?.[0]?.split("-");

      const type = newSku[2] == "PIECE" ? "P" : newSku[2];
      const quantityAndType = `${newSku[1]} ${type}`;

      const newName = nm?.length > 1 ? `*${nm[nm.length - 1]}` : newSku?.[0];
      const name = `${newName}  ${quantityAndType}`;

      if (obj[`${nm}_${quantityAndType}`]) {
         obj[`${nm}_${quantityAndType}`].multi += multi;
         obj[`${nm}_${quantityAndType}`].name = name;
      } else {
         obj[`${nm}_${quantityAndType}`] = { multi, name };
      }
   }

   const objLen = Object.keys(obj).length;

   let string = "";
   for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
         const element = obj[key];
         const multiple = element.multi > 1 ? ` *${element.multi}` : "";

         string += `${element.name} ${multiple}${objLen > 1 ? " | " : ""}`;
      }
   }

   return { name: string, isMakeable: objLen > 0 };
}

function drawText(
   page,
   x,
   y,
   h,
   text,
   fontSize,
   offset = 1,
) {
   // Draw white rectangle behind text
   page.drawRectangle({
      x: x - offset,
      y,
      width: getFontSize(text, fontSize) + 2 * offset,
      height: h,
      color: white,
   });

   // Draw text
   page.drawText(text, {
      x,
      y,
      size: fontSize,
      color: black,
   });
}

function getProductInfo(text) {
   return text
      ?.filter((_, i) => !(i % 2) && i !== text.length - 1)
      .map((e) => {
         const element = e.split("|");
         return element[element.length - 1];
      });
}

function getProductQuantity(text) {
   return text
      ?.filter((_, i) => !(i % 2) && i !== 0)
      ?.map((item) => item?.match(/Charges\s+(\d+)/)?.[1]);
}

function filterProductInformation(text) {
   const regex =
      /Shipping and Handling| Shipping and Handling|Shippingand Handling|Shipping andHandling|\| Not eligible for return|\| Noteligible for return|\| Not eligiblefor return|\| Not eligible forreturn|\|Not eligible for return/;
   const findIndex = text.indexOf("Product Description Qty");
   return text.slice(findIndex === -1 ? 0 : findIndex)?.split(regex);
}

function GET_JSON_FILE(file) {
   return new Promise(async (resolve) => {
      const data = await fetch(file);
      const json = await data.json();
      resolve(json);
   });
}
