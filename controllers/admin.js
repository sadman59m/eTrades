const { validationResult } = require("express-validator");

const Product = require("../models/product");
const fileHelper = require("../util/file");

const ITEMS_PER_PAGE = 2;

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    errorMessage: null,
    hasError: false,
    product: {
      title: "",
      imageUrl: "",
      price: "",
      description: "",
    },
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  // console.log(imageUrl);
  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      errorMessage: "Attached file is not an image",
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
    });
  }

  const imageUrl = image.path;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      errorMessage: errors.array()[0].msg,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
    });
  }

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user,
  });

  product
    .save()
    .then((result) => {
      console.log("Product Created");
      res.redirect("/admin/products");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/admin/products");
  }

  const productId = req.params.productId;

  Product.findById(productId)
    .then((product) => {
      if (!product) {
        return res.render("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/add-edit",
        product: product,
        editing: editMode,
        errorMessage: null,
        hasError: false,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const id = req.body.productId;
  const updatedTitle = req.body.title;
  const image = req.file;
  const updatedPrice = req.body.price;
  const updatedDescription = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: true,
      errorMessage: errors.array()[0].msg,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDescription,
        _id: id,
      },
    });
  }

  // if (!image) {
  //   return res.status(422).render("admin/edit-product", {
  //     pageTitle: "Add Product",
  //     path: "/admin/add-product",
  //     editing: true,
  //     errorMessage: "Attached file is not an image",
  //     hasError: true,
  //     product: {
  //       title: updatedTitle,
  //       price: updatedPrice,
  //       description: updatedDescription,
  //     },
  //   });
  // }

  Product.findById(id)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Anauthorized Access!"));
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDescription;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      product.userId = req.user;
      return product.save().then((result) => {
        console.log(`Product Updated`);
        res.redirect("/admin/products");
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const productId = req.params.productId;

  Product.findById(productId)
    .then((product) => {
      if (!product) {
        return next(new Error("Product Not Found."));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: productId, userId: req.user._id });
    })
    .then(() => {
      req.user.removeItemFromCart(productId);
      console.log(`Delete Successfull`);
      res.status(200).json({ message: "success!" });
    })
    .catch((err) => {
      res.status(500).json({ message: "deletion failed!" });
    });
};

exports.getProducts = (req, res, next) => {
  let currentPage = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments({ userId: req.user._id })
    .then((prodNums) => {
      totalItems = prodNums;
      return Product.find({ userId: req.user._id })
        .skip((currentPage - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      return res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
        hasNextPage: currentPage * ITEMS_PER_PAGE < totalItems,
        hasPreviousPage: currentPage > 1,
        nextPage: currentPage + 1,
        previousPage: currentPage - 1,
        currentPage: currentPage,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
