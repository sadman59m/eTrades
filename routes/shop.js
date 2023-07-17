const path = require("path");

const express = require("express");

const shopController = require("../controllers/shop");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/", shopController.getIndex);

router.get("/products", shopController.getProducts);

router.get("/product/:productId", shopController.getProduct);

router.get("/cart", isAuth.checkRoute, shopController.getCart);

router.post("/cart", isAuth.checkRoute, shopController.postCart);

router.post(
  "/cart-delete-item",
  isAuth.checkRoute,
  shopController.postDeleteCartItem
);

router.get("/checkout", isAuth.checkRoute, shopController.getCheckout);

router.get("/checkout/success", shopController.getCheckoutSuccess);

router.get("/checkout/cancel", shopController.getCheckout);

router.post("/create-order", isAuth.checkRoute, shopController.postOrder);

router.get("/orders", isAuth.checkRoute, shopController.getOrders);

router.get("/orders/:orderId", isAuth.checkRoute, shopController.getInvoice);

// router.get("/checkout", shopController.getCheckout);

module.exports = router;
