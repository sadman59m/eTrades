const crypto = require("crypto");

const User = require("../models/user");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const SendInBlueTransport = require("nodemailer-sendinblue-transport");
const { validationResult } = require("express-validator");

const API_KEY = process.env.SENDINBLUE_KEY;

const transporter = nodemailer.createTransport(
  new SendInBlueTransport({
    apiKey: API_KEY,
  })
);

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
    },
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // req.flash("error", errors.array()[0].msg);
    // console.log(errors.array());
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
    });
  }
  User.findOne({ email: email })
    .then((user) => {
      bcrypt.compare(password, user.password).then((doMatch) => {
        if (doMatch) {
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save((err) => {
            console.log(err);
            res.redirect("/?page=1");
          });
        }
        req.flash("error", "Invalid email or password!");
        let message = req.flash("error");
        if (message.length > 0) {
          message = message[0];
        } else {
          message = null;
        }
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: message,
          oldInput: {
            email: email,
            password: password,
          },
        });
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // req.flash("error", errors.array()[0].msg);
    // console.log(errors.array());

    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }
  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })
    .then((result) => {
      if (API_KEY) {
        transporter.sendMail({
          to: email,
          from: "shop@nodepractice.com",
          subject: "Signed Up Confirmation",
          html: `<h1> Account creation successful`,
        });
      }
      req.flash("error", "Account created Successfully! Please, log in.");
      return res.redirect("/login");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account exist for this email.");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        if (API_KEY) {
          transporter.sendMail({
            to: req.body.email,
            from: "shop@nodepractice.com",
            subject: "Reset Password",
            html: `<p> Password reset requested. </p>
                <p> Click this link https://online-shop-sadman59.onrender.com/reset/${token} to set new password. This session will be expired in 1 hour.`,
          });
          req.flash("error", "Please, Check your email for the reset link.");
        } else {
          req.flash(
            "error",
            "Send in blue must have deleted my API KEY again! 🙁"
          );
        }
        return res.redirect("/reset");
      })
      .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      if (!user) {
        return res.send(`<h1> Session Expired </h1>
                <h3> Click <a href="https://online-shop-sadman59.onrender.com/login"> here </a> to go back. </h3>`);
      }
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      return res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "Set New Password",
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      if (!user) {
        req.flash("error", "Something went wrong. Please, try again later.");
        return res.redirect("/login");
      }
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      req.flash(
        "error",
        "Password reset successful. Try login with the new password."
      );
      return res.redirect("/login");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
