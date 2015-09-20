#!/usr/bin/env node
var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var bodyParser = require('body-parser');
var glob = require("glob");
var fs = require("fs");
var shell = require('shelljs');

var directory = "./public_html";
	
shell.mkdir('-p', "./public_html");


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.use(express.static(__dirname + '/public_html'));

// routes will go here
app.post('/', function(request, response) {
   
   var command = request.body.params.mode;
   var params  = request.body.params;
   console.log(command);

   
   if(command=="list")
   {
   		ls(params,response);
   }
   else if(command=="rename")
   {
   		rename(params,response);
   }

});

// start the server
app.listen(port);
console.log('Nodebackend started! At http://localhost:' + port);

function rename(params,response)
{
	var source = directory+params.path;
	var destination = directory+params.newPath;

	try
	{
		shell.mv(source, destination);
		if(shell.error()) throw "error";

		response.send({ "result": { "success": true, "error": null } });
	}
	catch(ex)
	{
		response.send({ "result": { "success": false, "error": shell.error() } });	
		console.log(JSON.stringify(params));
	}
	
}
function ls(params,response)
{
	files = glob.sync(directory+params.path+"**/*");
	result = [];
	var temp = directory+params.path;
	if(params.path.length>1) temp = temp+"/";
	var count = (temp.match(/\//g) || []).length;
	for (var i = files.length - 1; i >= 0; i--) 
	{
		var samelevel = ((files[i]).match(/\//g) || []).length;
		if(samelevel==count) 
		{
			var stat = fs.lstatSync(files[i]);
			//console.log(JSON.stringify(stat));
			var filetype = "file";
			if(stat.isDirectory()) filetype = "dir";
			result.push({
				"name": files[i].replace(/^.*[\\\/]/, ''),
		        "rights": "drwxr-xr-x",
		        "size": stat.size,
		        "date": ""+(JSON.stringify(stat.mtime).slice(1,20)).replace("T"," "),
		        "type": filetype
			});
		}
	};
	var finalresponse  = {"result":result};
	response.send(finalresponse);
}
String.prototype.startsWith = function(needle)
{
    return(this.indexOf(needle) == 0);
};