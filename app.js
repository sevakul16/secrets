require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");

//insted of body parser
app.use(express.json());
app.use(express.urlencoded({extended: true}));

//connecting to mongodb
main().catch(err => console.log(err));

async function main(){
  await mongoose.connect("mongodb://localhost:27017/userDB");
}
//-----------------------------------------

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
});

console.log(process.env.SECRET);
userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res) {
  res.render("home");
});

app.route("/register")

.get(function(req, res) {
  res.render("register");
})

.post(function(req, res){
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });

  newUser.save(function(err){
    if (err) {
      console.log(err);
    } else {
      res.render("secrets");
    }
  });
});


app.route("/login")

.get(function(req, res) {
  res.render("login");
})

.post(function(req, res){
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email: username}, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        console.log(foundUser.password);
        if (foundUser.password === password) res.render("secrets");
      }
    }
  });
});

// app.get("/login", function(req, res) {
//   res.render("login");
// });



app.listen(3000, function() {
    console.log("Server started on port 3000.");
});
