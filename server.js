
module.exports = function (config, App) {
  
  var routes = require('./routes');
  var express = require('express');
  var flash = require('express-flash');
  var logger = require('morgan');
  var multer = require('multer');
  var cookieParser = require('cookie-parser');
  var bodyParser = require('body-parser');
  var session = require('express-session');
  var csrf = require('lusca').csrf();
  var errorHandler = require('errorhandler');
  var widget = require('./lib/widget');
  var expressValidator = require('express-validator');
  var hbs = require('hbs');
  var path = require('path');
  var passport = require('passport');
  var _ = require('lodash');
  var hbsHelpers = require('./helpers');
  var MongoStore = require('connect-mongo')({ session: session });
  
  
  /**
   * Create Express server.
   */
  var server = express();
  
  
  /**
   * Express configuration.
   */
  var hour = (1000 * 60 * 60);
  var day = hour * 24;
  var week = day * 7;
  
  var csrfWhitelist = [
    '/this-url-will-bypass-csrf'
  ];
  
  // port
  server.set('port', process.env.PORT || 3000);
  
  // define views folder  
  server.set('views', path.join(__dirname, 'views'));
  
  
  /*
   * Handlebars settings
  **/
  server.set('view engine', 'hbs');
  server.engine('hbs', hbs.__express);
  
  hbs.localsAsTemplateData(server);
  hbs.registerPartials(path.join(__dirname,'views', 'partials'));
  hbs.registerPartials(path.join(__dirname,'views', 'account'));
  hbs.registerPartials(path.join(__dirname,'views', 'events'));
  hbs.registerPartials(path.join(__dirname,'views', 'meetups'));
  hbs.registerPartials(path.join(__dirname,'views', 'posts'));
  
  // setup and register handlebars helpers
  hbsHelpers.setup(hbs);
  
  
  // parse cookies
  server.use(cookieParser());
  
  // session management
  server.use(session({
    secret: config.sessionSecret,
    store: new MongoStore({
      url: config.mongodb,
      auto_reconnect: true
    })
  }));
  
  // login management
  server.use(passport.initialize());
  server.use(passport.session());
  
  // handle image uploads
  server.use(multer({
    dest: './public/img/blog/',
    rename: function (fieldname, filename) {
      return 'image_' + Date.now();
    }
  }));
  
  // for forms
  server.use(bodyParser.json());
  server.use(bodyParser.urlencoded());
  
  // input validation
  server.use(expressValidator());
  
  // message display
  server.use(flash());
  
  // serve static files
  server.use(express.static(path.join(__dirname, 'public'), { maxAge: week }));
  
  
  // logging
  server.use(logger('dev'));
  
  // security
  server.use(function(req, res, next) {
    csrf(req, res, next);
  });
  
  // make user object available in templates
  server.use(function(req, res, next) {
    if (req.user) {
      res.locals.user = req.user.toJSON();
      req.session.user = res.locals.user;
    }
  
    res.locals.base = 'http://' + req.headers.host;
  
    next();
  });
  
  server.use(function(req, res, next) {
    // Keep track of previous URL to redirect back to
    // original destination after a successful login.
    if (req.method !== 'GET') return next();
    var path = req.path.split('/')[1];
    if (/(auth|login|logout|signup)$/i.test(path)) return next();
    req.session.returnTo = req.path;
    next();
  });
  
  // error handling
  server.use(errorHandler());
  
  // Load widgets
  server.use(widget({app: App}));

  routes.setup(server);

  return server;
};



