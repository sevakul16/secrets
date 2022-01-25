require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require("passport-facebook");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");

//insted of body parser
app.use(express.json());
app.use(express.urlencoded({extended: true}));

//INITIALISING SESSION
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

//INITIALISING PASSPORT
app.use(passport.initialize());
app.use(passport.session());

//connecting to mongodb
main().catch(err => console.log(err));

async function main(){
  //await mongoose.connect("mongodb://localhost:27017/userDB");
  await mongoose.connect('mongodb+srv://admin-vsevolod:Test123@cluster0.29c09.mongodb.net/userDB');

}
//-----------------------------------------

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//Sign in with Google
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID_GOOGLE,
    clientSecret: process.env.CLIENT_SECRET_GOOGLE,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//FACEBOOK SIGN IN DOES NOT WORK WITH HTTP
// passport.use(new FacebookStrategy({
//     clientID: process.env.FACEBOOK_APP_ID,
//     clientSecret: process.env.FACEBOOK_APP_SECRET,
//     callbackURL: "http://localhost:3000/auth/facebook/secrets"
//   },
//   function(accessToken, refreshToken, profile, cb) {
//     console.log(profile);
//     User.findOrCreate({ facebookId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

app.get("/", function(req, res) {
  res.render("home");
});


//Sign in with Google
app.route("/auth/google")
.get(passport.authenticate("google", {
    scope: ["profile"]
}));

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
});

//FACEBOOK SIGN IN DOES NOT WORK WITH HTTP
// app.get('/auth/facebook',
//   passport.authenticate('facebook'));
//
// app.get('/auth/facebook/secrets',
//   passport.authenticate('facebook', { failureRedirect: '/login' }),
//   function(req, res) {
//     // Successful authentication, redirect secrets.
//     res.redirect('/secrets');
//   });

//Rendering secrets page
app.get("/secrets", function(req, res){
  User.find({"secret":{$ne: null}},function(err, foundUsers){
    if (err) {
      console.log(err);
    } else {
      if (foundUsers){
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.route("/submit")

.get(function(req, res){
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
})

.post(function(req, res){
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      foundUser.secret = submittedSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      });
    }
  });
});

app.route("/register")

.get(function(req, res) {
  res.render("register");
})

.post(function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

  //REGISTRATION WITH BCRYPT
  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //   const newUser = new User({
  //     email: req.body.username,
  //     password: hash
  //   });
  //
  //   newUser.save(function(err){
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       res.render("secrets");
  //     }
  //   });
  // });
});


app.route("/login")

.get(function(req, res) {
  res.render("login");
})

.post(function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  passport.authenticate("local", function(err, user){
    if (err) {
      console.log(err);
    } else {
      if (user) {
        req.login(user, function(err){
          if (err) {
            console.log(err);
          } else {
            res.redirect("/secrets");
          }
        });
      } else {
        console.log("here!");
        res.redirect("/login");
      }
    }
  })(req, res);


  //LOGING IN WITH BCRYPT
  // const username = req.body.username;
  // const password = req.body.password;
  //
  // User.findOne({email: username}, function(err, foundUser){
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     if (foundUser) {
  //       console.log(foundUser.password);
  //       bcrypt.compare(password, foundUser.password, function(err, result) {
  //         if (result) res.render("secrets");
  //       });
  //     }
  //   }
  // });
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started!");
});
