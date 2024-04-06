const express = require("express");
const path = require("path");
const exphbs = require("express-handlebars");
const data = require("./modules/collegeData.js");

const app = express();

const HTTP_PORT = process.env.PORT || 8080;

app.engine('.hbs', exphbs.engine({
    defaultLayout: 'main',
    extname: '.hbs',
    helpers: {
        navLink: function (url, options) {
            return '<li' +
                ((url == app.locals.activeRoute) ? ' class="nav-item active" ' : ' class="nav-item" ') +
                '><a class="nav-link" href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function (lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        }
    }
}));

app.set('view engine', '.hbs');

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(function (req, res, next) {
    let route = req.path.substring(1);
    app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
    next();
});


app.get("/", (req, res) => {
    res.render("home");
});

app.get("/about", (req, res) => {
    res.render("about");
});

app.get("/htmlDemo", (req, res) => {
    res.render("htmlDemo");
});

app.get("/students", function (req, res) {
    if (req.query.course != undefined) {
        data.getStudentsByCourse(req.query.course)
            .then((studnetsByCourse) => {
                res.render("students", {
                    students: studnetsByCourse,
                });
            })
            .catch((err) => {
                res.render("students", {
                    message: "no results",
                });
            });
    } else {
        data.getAllStudents()
            .then((data) => {
                if (data.length > 0) {
                    res.render("students", {
                        students: data,
                    });
                } else {
                    res.render("students", { message: "no results" });
                }
            })
            .catch((err) => {
                res.render({
                    message: "no results",
                });
            });
    }
});

app.get("/students/add", (req, res) => {
    data.getCourses()
        .then((data) => {
            res.render("addStudent", { courses: data });
        })
        .catch((err) => {
            res.render("addStudent", { courses: [] });
        });
});

app.post("/students/add", (req, res) => {
    data.addStudent(req.body).then(() => {
        res.redirect("/students");
    })
    .catch((err) => {
        console.log(err);
    });
});

app.get("/student/:studentNum", (req, res) => {
    let viewData = {};
    data.getStudentByNum(req.params.studentNum)
        .then((data) => {
            if (data) {
                viewData.student = data;
            } else {
                viewData.student = null;
            }
        })
        .catch(() => {
            viewData.student = null;
        })
        .then(data.getCourses)
        .then((data) => {
            viewData.courses = data;
            for (let i = 0; i < viewData.courses.length; i++) {
                if (viewData.courses[i].courseId == viewData.student.course) {
                    viewData.courses[i].selected = true;
                }
            }
        })
        .catch(() => {
            viewData.courses = []; 
        })
        .then(() => {
            if (viewData.student == null) {
                res.status(404).send("Student Not Found");
            } else {
                res.render("student", { viewData: viewData }); 
            }
        });
});

app.get("/students/delete/:studentNum", (req, res) => {
    data.deleteStudentByNum(req.params.studentNum)
      .then((data) => {
        res.redirect("/students");
      })
      .catch((err) => {
        res.status(500).send("Unable to Remove Student / Student not found)");
      });
  });

app.post("/student/update", (req, res) => {
    data.updateStudent(req.body).then(() => {
        res.redirect("/students");
    });
});

app.get("/courses", (req, res) => {
    data.getCourses()
        .then((data) => {
            if (data.length > 0) {
                res.render("courses", {
                    courses: data,
                });
            } else {
                res.render("courses", {
                    message: "no results",
                });
            }
        })
        .catch((err) => {
            res.render({ message: "no results" });
        });
});

app.get("/courses/add", (req, res) => {
    res.render("addCourse");
});

app.post("/courses/add", (req, res) => {
    data.addCourse(req.body)
        .then(() => {
            res.redirect("/courses");
        })
        .catch((err) => {
            res.json({ message: "Can not add new course" });
        });
});

app.post("/course/update", (req, res) => {
    data.updateCourse(req.body.courseId, req.body)
        .then((data) => {
            res.redirect("/courses");
        })
        .catch((err) => {
            res.json({ message: "Course update failed" });
        });
});

app.get("/course/:id", (req, res) => {
    data.getCourseById(req.params.id)
        .then((data) => {
            if (data != undefined) {
                res.render("course", {
                    course: data,
                });
            } else {
                res.status(404).send("Course Not Found");
            }
        })
        .catch((err) => {
            res.render("course", { message: "${err}" });
        });
});

app.get("/course/delete/:id", (req, res) => {
    data.deleteCourseById(req.params.id)
        .then((data) => {
            res.redirect("/courses");
        })
        .catch((err) => {
            res.status(500).send("Unable to Remove Course / Course not found)");
        });
});

app.get("/course/:id", (req, res) => {
    data.getCourseById(req.params.id).then((data) => {
        res.render("course", { course: data });
    }).catch((err) => {
        res.render("course", { message: "no results" });
    });
});

app.use((req, res) => {
    res.status(404).send("Page Not Found");
});


data.initialize().then(function () {
    app.listen(HTTP_PORT, function () {
        console.log("app listening on: " + HTTP_PORT)
    });
}).catch(function (err) {
    console.log("unable to start server: " + err);
});

