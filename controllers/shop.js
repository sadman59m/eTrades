const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");
const stripe = require("stripe")(
  "sk_test_51NT3t7KdPj4lv6HNMT3XQ5FEksZXSONiT29KV4VLWEAfbAHYTALZZZUyozZgpsMXto37yefd6p7R2yLKwBQ7nn8O00WYPmg6fy"
);

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  let currentPage = +req.query.page || 1;
  let totalItems;

  Product.countDocuments()
    .then((prodNums) => {
      totalItems = prodNums;
      return Product.find()
        .skip((currentPage - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      if (products.length < 1) {
        currentPage -= 1;
        if (currentPage === 0) currentPage = 1;
        return res.redirect(`/products?page=${currentPage}`);
      }
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "Products",
        path: "/products",
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

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });

  // Product.findAll({ where: { id: prodId } })
  //   .then((products) => {
  //     res.render("shop/product-detail", {
  //       product: products[0],
  //       pageTitle: products[0].title,
  //       path: "/products",
  //     });
  //   })
  //   .catch((err) => {
  //     console.log(err);
  //   });
};

exports.getIndex = (req, res, next) => {
  let currentPage = +req.query.page || 1;
  let totalItems;

  Product.countDocuments()
    .then((prodNums) => {
      totalItems = prodNums;
      return Product.find()
        .skip((currentPage - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      if (products.length < 1) {
        currentPage -= 1;
        if (currentPage === 0) currentPage = 1;
        return res.redirect(`/?page=${currentPage}`);
      }
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
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

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    // .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  let products;
  let totalPrice = 0;
  req.user
    .populate("cart.items.productId")
    // .execPopulate()
    .then((user) => {
      products = user.cart.items;
      products.forEach((p) => {
        totalPrice += p.productId.price * p.quantity;
      });

      return stripe.checkout.sessions.create({
        // payment_method_types: ["card"],
        line_items: products.map((p) => {
          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: p.productId.title,
              },
              unit_amount: p.productId.price * 100,
            },
            quantity: p.quantity,
          };
        }),

        mode: "payment",
        success_url:
          req.protocol +
          "://" +
          req.get("host") +
          "/checkout/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel",
      });
    })
    .then((session) => {
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        totalPrice: totalPrice,
        sessionId: session.id,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const productId = req.body.productId;

  Product.findById(productId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postDeleteCartItem = (req, res, next) => {
  const productId = req.body.productId;
  console.log(productId);
  req.user
    .removeItemFromCart(productId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { productData: { ...i.productId._doc }, quantity: i.quantity };
      });
      const order = new Order({
        products: products,
        user: {
          email: req.user.email,
          userId: req.user,
        },
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then((result) => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { productData: { ...i.productId._doc }, quantity: i.quantity };
      });
      const order = new Order({
        products: products,
        user: {
          email: req.user.email,
          userId: req.user,
        },
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then((result) => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders, // with respective products array
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No order found!"));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Inavlid Order"));
      }
      const invoiceName = "invoice-" + orderId.toString() + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      const pdfDoc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename = "' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text(`Invoice`, {
        underline: true,
      });
      pdfDoc.fontSize(18).text(`ID: ${orderId}`);

      pdfDoc.text("-----------------------------------------------");

      let totalPrice = 0;

      order.products.forEach((p) => {
        pdfDoc
          .fontSize(14)
          .text(
            `${p.productData.title}                     $ ${p.productData.price} x ${p.quantity}`
          );
        totalPrice += p.quantity * p.productData.price;
      });

      pdfDoc.text("-------------------------------------------------");
      pdfDoc.fontSize(14).text(`Total Price:           $ ${totalPrice}`);

      pdfDoc.end();

      // fs.readFile(invoicePath, (err, data) => {
      //   if (err) {
      //     return next(err);
      //   }
      //   res.setHeader("Content-Type", "application/pdf");
      //   res.setHeader(
      //     "Content-Disposition",
      //     'inline; filename = "' + invoiceName + '"'
      //   );
      //   res.send(data);
      // });
    })
    .catch((err) => {
      return next(err);
    });
};

// exports.getCheckout = (req, res, next) => {
//   res.render("shop/checkout", {
//     path: "/checkout",
//     pageTitle: "Checkout",
//   });
// };
