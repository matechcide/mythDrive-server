const cors = require('cors');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const expressip = require('express-ip');
const fs = require('fs');
const url = require('url');
const { verifClient, gToken, vToken, accountToken, returnInfo, loopFile } = require(__dirname + '/verif')
const nodemailer = require('nodemailer');
const rimraf = require("rimraf");
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const getSize = require('get-folder-size');
const changeTime = require('change-file-time');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'mythdrive77186@gmail.com',
        pass: '/mathdrive1973Mg'
    }
});

app.set('view engine', 'ejs');
app.use(expressip().getIpInfoMiddleware);
app.use('/public', express.static('public'));
app.use(cors());

app.set('trust proxy', true)
app.set('port', 1080);
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());

const waitValideAccount = {};
const waitDownload = {}
const waitUpload = {}

app.get('/token', (req, res) =>{
    if(!verifClient(req) || req.headers.token != "get") return
    
    token = gToken(req.ip);

    res.send({
        "status" : "successful",
        "token" : token,
        "A_version" : fs.readdirSync(__dirname + "/app")[0].replace(".zip", ""),
        "B_version" : fs.readdirSync(__dirname + "/bootstrap")[0].replace(".zip", "")
    });
})

app.post('/CreateAccount', (req, res) =>{
    if(!verifClient(req)) return
    if(!vToken(req.headers.token, req.ip, true)){
        res.send({
            "status" : "error",
            "info" : "token invalide"
        });
        return
    }
    if(fs.readdirSync(__dirname + '/account/').includes(req.body.mail.toLowerCase() + '.json') || waitValideAccount[req.headers.token]){
        res.send({
            "status" : "error",
            "info" : "This mail is aredly used."
        });
        return
    }

    let mailOptions = {
        from: 'mythdrive77186@gmail.com',
        to: req.body.mail,
        subject: 'mythDrive account',
        text: 'http://mythdrive.ml:1080/ValideAccount?token=' + req.headers.token
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            res.send({
                "status" : "error",
                "info" : `${error}`
            });
        } 
        else{
            res.send({
                "status" : "successful",
                "info" : "The mail confirm is send."
            });
        }
    });

    waitValideAccount[req.headers.token] = req.body;
    setTimeout(function(){

        if(waitValideAccount[req.headers.token]) delete waitValideAccount[req.headers.token]

    }, 60*60000)

})

app.get('/ValideAccount', (req, res) =>{
    const urlObj = url.parse(req.url, true);
    if(waitValideAccount[urlObj.query.token]){
        res.render('valideToken')
        if(!fs.existsSync(__dirname + '/file/' + waitValideAccount[urlObj.query.token]['mail'].toLowerCase())) fs.mkdirSync(__dirname + '/file/' + waitValideAccount[urlObj.query.token]['mail'].toLowerCase())
        fs.writeFileSync(__dirname + '/account/' + waitValideAccount[urlObj.query.token]['mail'].toLowerCase() + '.json', JSON.stringify(waitValideAccount[urlObj.query.token]))
        delete waitValideAccount[urlObj.query.token]
    }
})

app.post('/ConnectAccount', (req, res) =>{
    if(!verifClient(req)) return
    if(!vToken(req.headers.token, req.ip, true)){
        res.send({
            "status" : "error",
            "info" : "token invalide"
        });
        return
    }
    if(waitValideAccount[req.headers.token] && waitValideAccount[req.headers.token].mail.toLowerCase() == req.body.mail.toLowerCase()){
        res.send({
            "status" : "error",
            "info" : "This account does not confirmed."
        });
        return
    }
    if(!fs.readdirSync(__dirname + '/account/').includes(req.body.mail + '.json')){
        res.send({
            "status" : "error",
            "info" : "This account don't exist."
        });
        return
    }
    const profile = require(__dirname + '/account/' + req.body.mail + '.json')
    if(profile.password == req.body.password){
        accountToken(req.headers.token, profile);
        res.send({
            "status" : "successful",
            "info" : "Successful identification."
        });
        return
    }
    else{
        res.send({
            "status" : "error",
            "info" : "Identifier is not valid."
        });
        return
    }
})

app.post('/DriveList', (req, res) =>{
    if(!verifClient(req)) return
    if(!vToken(req.headers.token, req.ip)){
        res.send({
            "status" : "error",
            "info" : "token invalide"
        });
        return
    }

    const profile = returnInfo(req.headers.token)
    if(fs.lstatSync(__dirname + "/file/" + profile + req.body.dir.substring(0, req.body.dir.length - 1)).isDirectory()){
        let list = fs.readdirSync(__dirname + "/file/" + profile + req.body.dir)
        
        if(!list){
            res.send({
                "status" : "error",
                "info" : "Fille don't exist."
            });
            return
        }

        listDir = [];
        listSyncDir = [];
        listFile = [];

        for(const dir of list){
            if(fs.lstatSync(__dirname + "/file/" + profile + req.body.dir + dir).isDirectory()){
                if(dir.includes('|typeFolder|Sync')) listSyncDir.push(dir);
                else listDir.push(dir);
            }
            else if(dir != "syncInfo") listFile.push(dir + "!" + fs.lstatSync(__dirname + "/file/" + profile + req.body.dir + dir).size)
            
        }
        getSize(__dirname + "/file/" + profile, (err, size) => {
            res.send({
                "status" : "successful",
                "dir" : listDir,
                "syncDir" : listSyncDir,
                "file" : listFile,
                "size" : size
            });
        });
    }
    else{
        res.send({
            "status" : "error",
            "info" : ""
        });
    }
})

app.post('/DriveAction', (req, res) =>{
    if(!verifClient(req)) return
    if(!vToken(req.headers.token, req.ip)){
        res.send({
            "status" : "error",
            "info" : "token invalide"
        });
        return
    }

    const profile = returnInfo(req.headers.token)

    if(req.body.action == "createFolder"){
        if(fs.existsSync(__dirname + "/file/" + profile + req.body.dir + req.body.name)){
            res.send({
                "status" : "error",
                "info" : "Folder aredly exist."
            });
            return
        }
        else{
            fs.mkdirSync(__dirname + "/file/" + profile + req.body.dir + req.body.name)
            res.send({
                "status" : "successful",
                "info" : ""
            });
            return
        }
    }
    else if(req.body.action == "delete"){
        if(fs.existsSync(__dirname + "/file/" + profile + req.body.dir)){
            if(fs.lstatSync(__dirname + "/file/" + profile + req.body.dir).isDirectory()) rimraf.sync(__dirname + "/file/" + profile + req.body.dir + "/");
            else fs.unlinkSync(__dirname + "/file/" + profile + req.body.dir)
            res.send({
                "status" : "successful",
                "info" : ""
            });
            return
        }
        else{
            res.send({
                "status" : "error",
                "info" : "File or Folder dont exist."
            });
            return
        }
    }
    else if(req.body.action == "listSync"){
        if(fs.existsSync(__dirname + "/file/" + profile + req.body.dir)){
            res.send({
                "status" : "successful",
                "info" : loopFile(__dirname + "/file/" + profile + req.body.dir + "/", __dirname + "/file/" + profile + req.body.dir + "/")
            });
        }
        else{
            res.send({
                "status" : "error",
                "info" : "File or Folder dont exist."
            });
            return
        }
    }
    else if(req.body.action == "changePassword"){
        temp = require(__dirname + '/account/' + profile + '.json')
        temp["password"] = req.body.newPassword
        fs.writeFileSync(__dirname + '/account/' + profile + '.json', JSON.stringify(temp))
        res.send({
            "status" : "successful",
            "info" : "successful"
        });
    }
    else if(req.body.action == "rename"){
        if(fs.existsSync(__dirname + "/file/" + profile + req.body.old)){
            fs.renameSync(__dirname + "/file/" + profile + req.body.old, __dirname + "/file/" + profile + req.body.new)
            res.send({
                "status" : "successful",
                "info" : "successful"
            });
        }
        else{
            res.send({
                "status" : "error",
                "info" : "File or Folder dont exist."
            });
            return
        }
    }
    else{
        res.send({
            "status" : "error",
            "info" : "Error action."
        });
    }

})

app.put('/DriveUpLoad', (req, res) =>{
    if(!verifClient(req)) return
    if(!vToken(req.headers.token, req.ip)){
        res.send({
            "status" : "error",
            "info" : "token invalide"
        });
        return
    }
    
    const profile = returnInfo(req.headers.token);
    if(req.body.status == "launch"){
        if(!waitUpload[req.headers.token]){
            res.send({
                "status" : "error",
                "info" : "error with file"
            });
            return
        }
        fs.appendFileSync(__dirname + '/file/' + profile + req.body.dir + req.body.name, req.files.file.data);
    }
    else if(req.body.status == "run" && waitUpload[req.headers.token] != "stop"){
        if(!waitUpload[req.headers.token]){
            res.send({
                "status" : "error",
                "info" : "error with file"
            });
            return
        }
        waitUpload[req.headers.token] = Date.now();
    }
    else if(req.body.status == "start"){
        waitUpload[req.headers.token] = Date.now();
        temp = __dirname + '/file/' + profile + req.body.dir + req.body.name
        fs.writeFileSync(__dirname + '/file/' + profile + req.body.dir + req.body.name, Buffer.from(""))
        const inter = setInterval(() => {
            if(waitUpload[req.headers.token] == "stop"){
                delete waitUpload[req.headers.token];
                clearInterval(inter);
                return
            }
            else if(waitUpload[req.headers.token] + 1000 < Date.now()){
                delete waitUpload[req.headers.token];
                setTimeout(() => {
                    fs.unlinkSync(temp);
                    clearInterval(inter);
                }, 100);
            }
        }, 1000);
    }
    else if(req.body.status == "stop"){
        waitUpload[req.headers.token] = "stop";
        let date = new Date(parseInt(req.body.lm))
        fs.utimesSync(__dirname + '/file/' + profile + req.body.dir + req.body.name, date, date);
    }

    res.send({
        "status" : "successful"
    });
})

app.post('/DriveDownLoad', (req, res) =>{
    if(!verifClient(req)) return
    if(!vToken(req.headers.token, req.ip)){
        res.send({
            "status" : "error",
            "info" : "token invalide"
        });
        return
    }

    const profile = returnInfo(req.headers.token)

    if(!fs.existsSync(__dirname + "/file/" + profile + req.body.dir)){
        res.send({
            "status" : "error",
            "info" : "Problem with file."
        });
        return
    }
    waitDownload[req.headers.token] = __dirname + "/file/" + profile + req.body.dir
    res.send({
        "status" : "successful",
        "info" : req.body.dir,
        "lm": fs.statSync(__dirname + "/file/" + profile + req.body.dir).mtimeMs,
        "file": fs.statSync(__dirname + "/file/" + profile + req.body.dir).size

    });
})

app.get('/getDrive', (req, res) =>{
    if(!verifClient(req)) return
    if(!vToken(req.headers.token, req.ip) || !waitDownload[req.headers.token]) return

    temp = waitDownload[req.headers.token]
    delete waitDownload[req.headers.token]

    res.send(fs.readFileSync(temp));
})

app.get('/downLoadApp', (req, res) =>{
    if(!verifClient(req)) return
    res.send(fs.readFileSync(__dirname + "/app/" + fs.readdirSync(__dirname + "/app")[0]));
})

app.get('/download', (req, res) =>{
    res.download(__dirname + "/bootstrap/" + fs.readdirSync(__dirname + "/bootstrap")[0]);
})

server.listen(1080, ()=>{
    console.log('Serving on port 1080');
})