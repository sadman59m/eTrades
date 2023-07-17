const path = require("path");

const express = require("express");
const { body } = require("express-validator");

const router = express.Router();

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");

// /admin/add-product => GET
router.get("/add-product", isAuth.checkRoute, adminController.getAddProduct);

// // /admin/products => GET
router.get("/products", isAuth.checkRoute, adminController.getProducts);

// // /admin/add-product => POST
router.post(
  "/add-product",
  [
    body("title", "Please, enter a valid title.")
      .isString()
      .isLength({ min: 3 })
      .trim(),
    body("price", "Please, enter a valid price.").isFloat(),
    body("description", "Please Enter a valid description.")
      .isLength({ min: 5, max: 200 })
      .trim(),
  ],
  isAuth.checkRoute,
  adminController.postAddProduct
);

router.get(
  "/edit-product/:productId",
  isAuth.checkRoute,
  adminController.getEditProduct
);

router.post(
  "/edit-product",
  [
    body("title", "Please, enter a valid title.")
      .isString()
      .isLength({ min: 3 })
      .trim(),
    body("price", "Please, enter a valid price.").isFloat(),
    body("description", "Please Enter a valid description.")
      .isLength({ min: 5, max: 200 })
      .trim(),
  ],
  isAuth.checkRoute,
  adminController.postEditProduct
);

router.delete(
  "/product/:productId",
  isAuth.checkRoute,
  adminController.deleteProduct
);

module.exports = router;
