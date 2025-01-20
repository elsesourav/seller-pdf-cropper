import { rgb } from "pdf-lib";

// Colors
export const white = rgb(1, 1, 1);
export const black = rgb(0, 0, 0);

// Text and Font utilities
export function getFontSize(text, fontSize = 7) {
   return (fontSize - 2) * text.length;
}

export function getDimensions(width) {
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

export function getMatchSKU(CHANGES_SKU, CHANGES_NAME, _sku) {
   if (CHANGES_SKU[_sku]) return CHANGES_SKU[_sku].NEW_SKU_ID;

   const sku = _sku?.split("__");
   if (sku.length < 3) return _sku;

   const _name = sku[0].split("-");
   const name1 = _name[_name.length - 1];
   const _nameLen = _name.length;
   if (_nameLen > 1) _name.pop();
   const name0 = _name.length > 1 ? _name.join("-") : "";
   sku.shift();

   // if name exists in CHANGES_NAME      
   if (CHANGES_NAME[name1]) {
      const newName = _nameLen > 1 ? [name0, CHANGES_NAME[name1]].join("-") : CHANGES_NAME[name1];
      const newSku = [newName, ...sku].join("__");
      if (CHANGES_SKU[newSku]) return CHANGES_SKU[newSku].NEW_SKU_ID;
   }

   // if name not exists in CHANGES_NAME
   for (let i = 1; i < name1.length; i++) {
      const nm = `${name1.slice(0, i)} ${name1.slice(i)}`;
      const newSku = [nm, ...sku].join("__");
      if (CHANGES_SKU[newSku]) return CHANGES_SKU[newSku].NEW_SKU_ID;
   }

   // if name exists in CHANGES_NAME but not in CHANGES_SKU
   if (CHANGES_NAME[name1]) {
      const newName = _nameLen > 1 ? [name0, CHANGES_NAME[name1]].join("-") : CHANGES_NAME[name1];
      return [newName, ...sku].join("__");
   }

   return _sku;
}

export function checkAndUpdateSKU(CHANGES_SKU, CHANGES_NAME, text) {
   const sku = text?.trim();
   const splitSku = sku?.split("|");
   const _sku_ = splitSku.length > 1 ? splitSku[0].trim() : sku;
   // console.log(_sku_);
   // console.log(CHANGES_SKU[_sku_]?.NEW_SKU_ID);
   // console.log(`----------------------------------\n`);
   return getMatchSKU(CHANGES_SKU, CHANGES_NAME, _sku_);
}

export function getSKUToProductInfo(sku, quantity) {
   const newSku = sku?.split("__");

   const nm = newSku?.[0]?.split("-");
   const newName = nm?.length > 1 ? `*${nm[nm.length - 1]}` : newSku?.[0];

   const type = newSku[2] == "PIECE" ? "P" : newSku[2];

   const quantityAndType = `${newSku[1]} ${type}`;
   const multiple = quantity > 1 ? ` *${quantity}` : "";

   const name = `${newName}  ${quantityAndType}${multiple}`;
   return { name, isMakeable: newSku.length > 2 };
}

export function getSKUsToProductInfo(product, quantity, CHANGES_SKU, CHANGES_NAME) {
   if (product.length !== quantity.length)
      return { name: "", isMakeable: false };
   const obj = {};

   for (let j = 0; j < product.length; j++) {
      const text = product[j];
      const multi = parseInt(quantity[j]);

      const sku = checkAndUpdateSKU(CHANGES_SKU, CHANGES_NAME, text);
      // console.log(sku);
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

   //    console.log(product);
   //    console.log(obj);
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

export function drawText(
   page,
   x,
   y,
   h,
   text,
   fontSize,
   offset = 1,
   sizeMakeSmall = 0
) {
   page.drawRectangle({
      x: x - offset,
      y,
      width: getFontSize(text, fontSize - sizeMakeSmall),
      height: h,
      color: white,
   });

   page.drawText(text, {
      x,
      y,
      size: fontSize,
      color: black,
   });
}

export function getProductInfo(text) {
   return text
      ?.filter((_, i) => !(i % 2) && i !== text.length - 1)
      .map((e) => {
         const element = e.split("|");
         return element[element.length - 1];
      });
}

export function getProductQuantity(text) {
   return text
      ?.filter((_, i) => !(i % 2) && i !== 0)
      ?.map((item) => item?.match(/Charges\s+(\d+)/)?.[1]);
}

export function filterProductInformation(text) {
   const regex =
      /Shipping and Handling| Shipping and Handling|Shippingand Handling|Shipping andHandling|\| Not eligible for return|\| Noteligible for return|\| Not eligiblefor return|\| Not eligible forreturn|\|Not eligible for return/;
   const findIndex = text.indexOf("Product Description Qty");
   return text.slice(findIndex === -1 ? 0 : findIndex)?.split(regex);
}
