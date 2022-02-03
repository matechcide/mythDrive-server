const fs = require('fs');

function verifClient(req){
    if(req.headers.host == "mythdrive.ml:1080" && req.headers["user-agent"] == "clientMythDrive" && !req.headers.cookie && !req.headers['cache-control'] && !req.headers['upgrade-insecure-requests']) return true
    else return false
}

const rand=()=>Math.random(0).toString(36).substr(2);
const token=(length)=>(rand()+rand()+rand()+rand()).substr(0,length);

const tokenList = {};
const tokenDelList = {};
const ipTokenList = {};

function gToken(ip){
    if(ipTokenList[ip]){
        tokenList[ipTokenList[ip]] = {
            "ip": ip
        };
        supToken(ipTokenList[ip])
        return ipTokenList[ip];
    }
    let tempToken = token(36);
    while(tokenList[tempToken]){
        tempToken = token(36);
    }
    ipTokenList[ip] = tempToken;
    tokenList[tempToken] = {
        "ip": ip
    };
    supToken(tempToken)
    return tempToken;
    
}

function vToken(tempToken, ip, step){
    if(!tokenList[tempToken] || !step && !tokenList[tempToken]["account"]) return false;
    if(tokenList[tempToken] && tokenList[tempToken]["ip"] == ip){

        supToken(tempToken)
        return true;
    } 
    else{
        if(tokenList[tempToken]) delete ipTokenList[tokenList[tempToken]["ip"]]
        delete tokenList[tempToken]
        return false;
    } 
    
}

function accountToken(tempToken, account){
    
    tokenList[tempToken]["account"] = account

    return
    
}

function returnInfo(tempToken){
    return tokenList[tempToken]["account"]["mail"]
}

async function supToken(tempToken){

    if(tokenDelList[tempToken]) clearTimeout(tokenDelList[tempToken]);

    tokenDelList[tempToken] = setTimeout(function(){

        delete ipTokenList[tokenList[tempToken]["ip"]]
        delete tokenList[tempToken]

    }, 30*60000)

    
}

function loopFile(path, base){
    let allFille = {}
    let folderName = path.split('/')[path.split('/').length-2]
    allFille[folderName] = {
        "**file**": [],
        "**folder**" : [],
        "**path**": "/" + path.replace(base, '')
    }
    for(const file of fs.readdirSync(path)){
        if(fs.lstatSync(path + file).isDirectory()){
            allFille[folderName]["**folder**"].push(file)
            allFille[folderName][file] = loopFile(path + file + "/", base)
        }
        else if(file != "syncInfo"){
            allFille[folderName]["**file**"].push([file, fs.statSync(path + file).mtimeMs])
        }
    }
    return allFille

}

module.exports = {
    verifClient, 
    gToken,
    vToken,
    accountToken,
    returnInfo,
    loopFile
}