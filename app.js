// SET FOREIGN_KEY_CHECKS=0;
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const session = require('express-session');
const {
  v4: uuidv4
} = require('uuid');
const router = require('./router.js');
const mysql = require('mysql');

// Create Connection
const db = mysql.createConnection({
  // host: 'bkhgx2u4y9suvchhkhfa-mysql.services.clever-cloud.com',
  // user: 'uutqv5ukyrirqrk0',
  // password: 'gXAVfjsr2g4loKejo5dk',
  // database: 'bkhgx2u4y9suvchhkhfa'
  host: 'localhost',
  user: 'root',
  password : '',
  database :'university_database_test'

});
db.connect((err => {
  if (err) {
    throw err;
  }
  console.log('MySql Connected');
  db.query("SET FOREIGN_KEY_CHECKS=0",(err,result)=>{
    if(err)
    throw err;
  })
}));

// Using different thing
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static('public'));

app.use(session({
  secret: uuidv4(),
  resave: false,
  saveUninitialized: false
}));


// Login page
app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect('dashboard');
  } else {
    res.sendFile(__dirname + "/index.html");
  }
});

// Dashboard login check
app.get('/dashboard', function(req, res) {
  if (req.session.user) {
    if (req.session.user.status == 'student') {
      let sql = `SELECT * FROM subject WHERE sub_id IN (SELECT c.sub_id FROM contain c LEFT JOIN enroll e ON(e.sub_id=c.sub_id AND e.s_id = \'${req.session.user.s_id}\') WHERE c.d_id = \'${req.session.user.s_dep}\' AND e.sub_id IS NULL)`;
      let sql2 = `SELECT subject.sub_name FROM subject WHERE sub_id IN (SELECT sub_id FROM enroll WHERE s_id = \'${req.session.user.s_id}\')`;
      db.query(sql, (err, result) => {
        if (err) {
          throw err;
        } else {
          db.query(sql2, (err, result2) => {
            if (err) {
              throw err;
            } else {
              console.log(result2);
              res.render('dashboard', {
                enrolsub: result2,
                status: req.session.user.status,
                data: result
              });

            }
          })
        }
      });
    } else if (req.session.user.status == 'admin') {
      let sql = `SELECT COUNT(DISTINCT s_id) s_no , COUNT(DISTINCT t_id) t_no, COUNT(DISTINCT sub_id) AS sub_no,d_name
                  FROM (SELECT s.s_id, t.t_id , c.sub_id , d.d_name  FROM department d LEFT JOIN student s ON  s.s_dep = d.d_id LEFT JOIN teacher t ON t.t_dept = d.d_id LEFT JOIN contain c ON c.d_id = d.d_id) AS new_tab
                  GROUP BY new_tab.d_name`;
      db.query(sql,(err,result)=>{
        if(err){
          throw err;
        }
        else{
          console.log(result);
          res.render('dashboard', {
            data : result,
            status: req.session.user.status
          });

        }

      });

    } else if(req.session.user.status=='teacher'){
      let sql = `SELECT s_name FROM student WHERE s_dep=\'${req.session.user.t_dept}\'`;
      db.query(sql,(err,s_name)=>{
        if(err){
          throw err;
        }
        else{
          let sql2 = `SELECT sub_name FROM subject WHERE sub_id IN (SELECT sub_id FROM contain WHERE d_id=\'${req.session.user.t_dept}\')`;
          db.query(sql2,(err,sub_name)=>{
            if(err){
              throw err;
            }
            else{
              console.log(sub_name);
              console.log(sub_name);
              res.render('dashboard', {
                status: req.session.user.status,
                subject : sub_name,
                student : s_name

              });

            }
          })

        }

      });
    }
    else  {
      res.render('dashboard', {
        status: req.session.user.status
      });
    }
  } else {
    res.redirect('/');
  }
});
app.post('/dashboard', (req, res) => {
  let sql;
  if (req.body.status == 'student') {
    sql = `SELECT * FROM student WHERE s_email=\'${req.body.email}\' AND s_password=\'${req.body.password}\'`;
  } else if (req.body.status == 'teacher') {
    sql = `SELECT *  FROM teacher WHERE t_email=\'${req.body.email}\' AND t_password=\'${req.body.password}\'`;
  } else if (req.body.email == 'admin@muet.pk' && req.body.password == 'admin' && req.body.status == 'admin') {
    req.session.user = {
      status: req.body.status
    };
    res.redirect('/dashboard');
  } else {
    res.end('Invalid Username');
  }
  console.log(req.session.user);
  if (sql) {
    db.query(sql, (err, result) => {
      if (result.length == 1) {
        result[0].status = req.body.status;
        req.session.user = result[0];
        console.log(req.session.user);
        res.redirect('/dashboard');
      }
    });
  }




});

// Add Teachers
app.get("/addteacher", (req, res) => {
  if (req.session.user) {
    let sql = 'SELECT contain.sub_id,contain.d_id,subject.sub_name FROM contain LEFT JOIN subject ON contain.sub_id=subject.sub_id';
    let tsubjects;
    db.query(sql, (err, result) => {
      if (err) {
        throw err;
      } else {
        tsubjects = result;

      }
    });
    let sql1 = 'SELECT d_name , d_id FROM department';
    db.query(sql1, (err, result) => {
      if (err) {
        throw err;
      } else {
        let departments = result;
        console.log(tsubjects);
        res.render('form', {
          formtype: "AT",
          status: req.session.user.status,
          departments: departments,
          tsubject: tsubjects,
          route: req.originalUrl
        });
      }
    });
  } else {
    res.redirect('/')
  }
});

app.post("/addteacher", (req, res) => {
  let noOfTeacher;
  if (req.session.user) {
    // Getting no of emp
    let not = `SELECT COUNT(t_id) AS tno FROM teacher WHERE t_dept = \'${req.body.dept}\' `;
    db.query(not, (err, result) => {
      if (err) {
        throw err;
      } else {
        noOfTeacher = (result[0].tno) + 1;
        console.log(noOfTeacher);
        let tid = 'T' + req.body.dept + noOfTeacher;
        let tname = req.body.name;
        let dob = req.body.dob;
        let address = req.body.address;
        let email = tid + "@muet.edu.com"
        let password = req.body.password;
        let dept = req.body.dept;
        let subject = req.body.tsubject;
        let sql = 'INSERT INTO teacher(t_id,t_name,t_dob,t_address,t_email,t_password,t_dept,t_subject) VALUES (?,?,?,?,?,?,?,?)';
        db.query(sql, [tid, tname, dob, address, email, password, dept, subject], (err, result) => {
          if (err) {
            throw err;
          } else {
            res.redirect('/addteacher');
          }
        });
      }
    });
  } else {
    res.redirect('/');
  }
});

// Add Student
app.get("/addstudent", (req, res) => {
  if (req.session.user) {
    let sql = 'SELECT d_name , d_id FROM department';
    db.query(sql, (err, result) => {
      if (err) {
        throw err;
      } else {
        res.render('form', {
          departments: result,
          status: req.session.user.status,
          formtype: "AS",
          route: req.originalUrl
        });
      }
    });
  } else {
    res.redirect('/');
  }
});

app.post('/addstudent', (req, res) => {
  let dept = (req.session.user.status == 'admin') ? req.body.dept : req.session.user.t_dept;
  let noOfStudent;
  if (req.session.user) {
    let not = `SELECT COUNT(s_id) AS sno FROM student WHERE s_dep = \'${dept}\' `;
    db.query(not, (err, result) => {
      if (err) {
        throw err;
      } else {
        noOfStudent = (result[0].sno) + 1;
        console.log(noOfStudent);

        let sid = dept + noOfStudent;
        let sname = req.body.name;
        let dob = req.body.dob;
        let email = sid + "@muet.edu.com"
        let password = req.body.password;
        let phoneno = req.body.phoneno;
        let sql = 'INSERT INTO student(s_id,s_name,s_email,s_password,s_dob,s_phoneNo,s_dep) VALUES(?,?,?,?,?,?,?)';
        db.query(sql, [sid, sname, email, password, dob, phoneno, dept], (err, result) => {
          if (err) {
            throw err;
          } else {
            res.redirect('/addstudent');
          }
        });
      }
    });

  } else {
    res.redirect('/');
  }
})


// Add Department
app.get("/adddepartment", (req, res) => {
  if (req.session.user) {
    res.render('form', {
      status: req.session.user.status,
      formtype: "AD",
      route: req.originalUrl
    });

  } else {
    res.redirect('/');
  }
});

app.post("/adddepartment", (req, res) => {
  if (req.session.user) {
    let name = req.body.name;
    let id = req.body.id;
    let address = req.body.address;
    let manager = req.body.d_manager;
    let fess = Number(req.body.d_fess);
    let sql = `INSERT INTO department (d_id,d_name,d_manager,d_fees,d_location) VALUES (?,?,?,?,?)`;
    db.query(sql, [id, name, manager, fess, address], (err, result) => {
      if (err) {
        throw err;
      } else {
        console.log(result);
        res.redirect('/adddepartment')
      }
    });
  } else {
    res.redirect('/');
  }
});

// Subject
app.get("/addsubject", (req, res) => {
  if (req.session.user) {
    res.render('form', {
      status: req.session.user.status,
      formtype: "ASB",
      route: req.originalUrl
    });
  } else {
    res.redirect('/');
  }
});

app.post('/addsubject', (req, res) => {
  if (req.session.user) {
    let sub = req.body.subname;
    let sql = `INSERT INTO subject(sub_name) VALUES(?)`;
    db.query(sql, [sub], (err, result) => {
      if (err) {
        throw err;
      } else {
        res.redirect('/addsubject');
      }
    });

  } else {
    res.redirect('/');
  }
});


// Add Department Subject
app.get('/adddepartmentsubject', (req, res) => {
  if (req.session.user) {
    let subjects;
    let departments;
     (req.session.user.status == 'admin') ? req.body.dept : req.session.user.t_dept;
    let sql = (req.session.user.status == 'admin') ? 'SELECT * FROM subject ' : `SELECT s.sub_name, s.sub_id FROM subject s LEFT JOIN contain c ON (c.sub_id = s.sub_id AND c.d_id= \'${req.session.user.t_dept}\' ) WHERE c.sub_id IS NULL`;
    db.query(sql, (err, result) => {
      if (err) {
        throw err;
      } else {
        subjects = result;
        console.log(result);

      }
    });
    let sql2 = 'SELECT d_id , d_name FROM department';
    db.query(sql2, (err, result) => {
      if (err) {
        throw err;
      } else {
        departments = result;
        res.render('form', {
          formtype: 'ADSB',
          status: req.session.user.status,
          subjects: subjects,
          departments: departments,
          route: req.originalUrl

        });
      }
    });

  } else {
    res.redirect('/');
  }

});


app.post('/adddepartmentsubject', (req, res) => {
  if (req.session.user) {
    let dept = (req.session.user.status == 'admin') ? req.body.dept : req.session.user.t_dept;
    let sub = req.body.deptsub;
    let credithour = req.body.credithour;
    let sql = 'INSERT INTO contain(d_id,sub_id,credit_hour) VALUES(?,?,?)';
    db.query(sql, [dept, sub, credithour], (err, result) => {
      if (err) {
        throw err;
      } else {
        res.redirect('/adddepartmentsubject');
      }
    });

  } else {
    res.redirect('/');
  }
});


app.post('/enroll', (req, res) => {
  if (req.session.user.status == 'student') {
    let sql = `INSERT INTO enroll(s_id,sub_id) VALUES (?,?)`;
    db.query(sql, [req.session.user.s_id, req.body.sub_id], (err, result) => {
      if (err) {
        throw err;
      } else {
        res.redirect('/dashboard');
      }
    });

  } else {
    redirect('/');
  }
});
// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(function(err) {
    if (err) {
      console.log(err);
      res.send('Error');
    } else {
      res.redirect('/')
    }
  })
});
app.listen(port, function() {
  console.log("Listing at port " + port);
})
