var express = require('express');
var router = express.Router();

var app = express();
app.use(express.static('public'));
app.set('view engine','ejs');


module.exports = router;
