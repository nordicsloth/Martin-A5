const express = require('express');
const app = express();

var mysql = require('mysql');

// install first using npm install bcrypt
const bcrypt = require('bcrypt');

const conInfo = 
{
    host: process.env.IP,
    user: process.env.C9_USER,
    password: "",
    database: "SONGDB"
};

var session = require('express-session'); 
app.use(session({ secret: 'happy jungle', 
                  resave: false, 
                  saveUninitialized: false, 
                  cookie: { maxAge: 600000 }}))

app.all('/', whoIsLoggenIn);
app.all('/register', register);
app.all('/login', login);
app.all('/logout', logout);
app.all('/listSongs', listSongs);
app.all('/addSong', addSong);
app.all('/removeSong', removeSong);
app.all('/clearSongs', clearSongs);

app.listen(process.env.PORT,  process.env.IP, startHandler())

function startHandler()
{
  console.log('Server listening on port ' + process.env.PORT)
}

function whoIsLoggenIn(req, res)
{
 if (req.session.user == undefined)
    writeResult(req, res, {'result' : 'Nobody is logged in.'});
  else
    writeResult(req, res, {'user' : req.session.user});
}

function register(req, res)
{
  if (req.query.email == undefined)
  {
    writeResult(req, res, {'error' : "Please specify a valid email"});
    return;
  }

  if (req.query.password == undefined)
  {
    writeResult(req, res, {'error' : "Password must have a minimum of eight characters, at least one letter and one number"});
    return;
  }

  var con = mysql.createConnection(conInfo);
  con.connect(function(err) 
  {
    if (err) 
      writeResult(req, res, {'error' : err});
    else
    {
      let hash = bcrypt.hashSync(req.query.password, 12);
      con.query("INSERT INTO USER (USER_EMAIL, USER_PASSWORD) VALUES (?, ?)", [req.query.email, hash], function (err, result, fields) 
      {
        if (err) 
        {
          if (err.code == "ER_DUP_ENTRY")
            err = "User account already exists.";
          writeResult(req, res, {'error' : err});
        }
        else
        {
          con.query("SELECT * FROM USER WHERE USER_EMAIL = ?", [req.query.email], function (err, result, fields) 
          {
            if (err) 
              writeResult(req, res, {'error' : err});
            else
            {
              req.session.user = {'result' : {'id': result[0].USER_ID, 'email': result[0].USER_EMAIL}};
              writeResult(req, res, req.session.user);
            }
          });
        }
      });
    }
  });
}

function login(req, res)
{
  if (req.query.email == undefined)
  {
    writeResult(req, res, {'error' : "Email is required"});
    return;
  }

  if (req.query.password == undefined)
  {
    writeResult(req, res, {'error' : "Password is required"});
    return;
  }
  
  var con = mysql.createConnection(conInfo);
  con.connect(function(err) 
  {
    if (err) 
      writeResult(req, res, {'error' : err});
    else
    {
      con.query("SELECT * FROM USER WHERE USER_EMAIL = ?", [req.query.email], function (err, result, fields) 
      {
        if (err) 
          writeResult(req, res, {'error' : err});
        else
        {
          if(result.length == 1 && bcrypt.compareSync(req.query.password, result[0].USER_PASSWORD))
          {
            req.session.user = {'result' : {'id': result[0].USER_ID, 'email': result[0].USER_EMAIL}};
            writeResult(req, res, req.session.user);
          }
          else 
          {
            writeResult(req, res, {'error': "Invalid email/password"});
          }
        }
      });
    }
  });
}

function logout(req, res)
{
  req.session.user = undefined;
  writeResult(req, res, {'result' : 'Nobody is logged in.'});
}

function listSongs(req, res)
{
   if (req.session.user == undefined)
    writeResult(req, res, {'result' : 'Nobody is logged in.'});
  else
  {
    var con = mysql.createConnection(conInfo);
    con.connect(function(err) 
    {
      if (err) 
        writeResult(req, res, {'error' : err});
      else
      {
        con.query("SELECT * FROM SONGS ORDER BY SONG_NAME", function (err, result, fields) 
        {
          if (err) 
            writeResult(req, res, {'error' : err});
          else
            writeResult(req, res, {'result' : result});
        });
      }
    });
  }
}

function addSong(req, res)
{
  if (req.query.song == undefined)
    writeResult(req, res, {'error' : "Add requires you to enter a song"});
  else
  {
    var con = mysql.createConnection(conInfo);
    con.connect(function(err) 
    {
      if (err) 
        writeResult(req, res, {'error' : err});
      else
      {
        con.query('INSERT INTO SONGS (SONG_NAME, USER_ID) VALUES (?, ?)', [req.query.song, req.session.user.result.id], function (err, result, fields) 
        {
          if (err) 
            writeResult(req, res, {'error' : err});
          else
          {
            con.query("SELECT * FROM SONGS WHERE USER_ID = ? ORDER BY SONG_NAME", [req.session.user.result.id],  function (err, result, fields) 
            {
                  if (err) 
                    writeResult(req, res, {'error' : err});
                  else
                    writeResult(req, res, {'result' : result});
            });
          }
        });
      }
    });
  }
}

function removeSong(req, res)
{
  if (req.query.song == undefined)
    writeResult(req, res, {'error' : "Remove requires you to enter a song"});
  else
  {
    var con = mysql.createConnection(conInfo);
    con.connect(function(err) 
    {
      if (err) 
        writeResult(req, res, {'error' : err});
      else
      {
        con.query('DELETE FROM SONGS WHERE SONG_NAME = ?', [req.query.song], function (err, result, fields) 
        {
          if (err) 
            writeResult(req, res, {'error' : err});
          else
          {
            con.query("SELECT * FROM SONGS ORDER BY SONG_NAME", function (err, result, fields) 
            {
              if (err) 
                writeResult(req, res, {'error' : err});
              else
                writeResult(req, res, {'result' : result});
            });
          }
        });
      }
    });
  }
}

function clearSongs(req, res)
{
  var con = mysql.createConnection(conInfo);
  con.connect(function(err) 
  {
    if (err) 
      writeResult(req, res, {'error' : err});
    else
    {
      con.query('DELETE FROM SONGS', function (err, result, fields) 
      {
        if (err) 
          writeResult(req, res, {'error' : err});
        else
        {
          con.query("SELECT * FROM SONGS ORDER BY SONG_NAME", function (err, result, fields) 
          {
            if (err) 
              writeResult(req, res, {'error' : err});
            else
              writeResult(req, res, {'result' : result});
          });
        }
      });
    }
  });
}

function writeResult(req, res, obj)
{
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(obj));
  res.end('');
}