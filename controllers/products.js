// importing the Product Class from the models.
const Product = require("../models/product");

// Get Add Products page controller
exports.getAddProduct = (req, res, next) => {
  res.render("add-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
  });
};

// Post products controller
exports.postAddProduct = (req, res, next) => {
  const product = new Product(req.body.title);
  product.save();
  res.redirect("/");
};

// Get all the products
exports.getProducts = (req, res, next) => {
  // calling fetchAll() on the Product class itself, not instance
  Product.fetchAll((products) => {
    res.render("shop", { prods: products, pageTitle: "Shop", path: "/" });
  });
};
