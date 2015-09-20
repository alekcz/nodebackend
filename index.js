#!/usr/bin/env node
var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var bodyParser = require('body-parser');
var glob = require("glob");
var fs = require("fs");
var shell = require('shelljs');
var archiver = require('archiver');
var decompress = require('decompress-zip');
var mime = require('mime');
var formidable = require('formidable');
var multer  = require('multer'); 
var stat_mode = require('stat-mode');

var directory = "./public_html";
var maxfiles = 100;
shell.mkdir('-p', directory);

var storage = multer.diskStorage({
  destination: function (request, file, cb) 
  {
  	var destination = __dirname+directory.substring(1)+request.body.destination;
    cb(null, destination)
  },
  filename: function (request, file, cb) {
    cb(null, file.originalname)
  }
})

var upload = multer({ storage: storage });

var fieldlist = generateFieldlist(maxfiles);

/*
multer requires fields to be specified so this 
generates maxfiles' possible fields. 
Therefore only 'maxfiles' files can be selected
simultaneously. 
*/
function generateFieldlist(N)
{
	var allowed_fields = [];
	for (var i = 0; i < N; i++) 
	{
		allowed_fields.push({ name: 'file-'+i});
	};
	return allowed_fields;
}


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.use(express.static(__dirname + '/public_html'));

// routes will go here
app.post('/', function(request, response) 
{
   
   	if(typeof(request.body.params)!='undefined')
	{
		var command = request.body.params.mode;
   		var params  = request.body.params;
    	console.log(command);
	
	   	if(!params.path.startsWith('/public_html'))
	   	{
		   if(command=="list")
		   {
		   		ls(params,response);
		   }
		   else if(command=="rename")
		   {
		   		move_rename(params,response);
		   }
		   else if(command=="copy")
		   {
		   		copy(params,response);
		   }
		   else if(command=="delete")
		   {
		   		deleter(params,response);
		   }
		   else if(command=="addfolder")
		   {
		   		addfolder(params,response);
		   }
		   else if(command=="editfile")
		   {
		   		readfile(params,response);
		   }
		   else if(command=="savefile")
		   {
		   		writefile(params,response);
		   }
		   else if(command=="compress")
		   {
		   		compress(params,response);
		   }
		   else if(command=="extract")
		   {
		   		extract(params,response);
		   }
		   else if(command=="changepermissions")
		   {
		   		changepermissions(params,response);
		   }
		   
		   else if(command=="download")
		   {
		   		download(params,response);
		   }
		   else
		   {
		   		console.log(JSON.stringify(params));
				response.send({ "result": 
				{
					"success": false,
					"error": "Invalid command"
				}});
		   }
		}
		else 
		{
			response.send({ "result": 
			{
				"success": false,
				"error": "Stop trying to hack."
			}});
		}
	}
	else 
	{
		console.log(JSON.stringify(request.body));	
		response.send({ "result": 
		{
			"success": false,
			"error": "Malformed request."
		}});
	}
});
app.post('/upload', upload.fields(fieldlist),function(request, response) 
{
	/*form.parse(request, function(err, fields, files) 
	{
		var destination = __dirname+directory.substring(1)+fields.destination;
		console.log(JSON.stringify(files));
		for (var key in files) 
		{
		    if (files.hasOwnProperty(key)) 
		    {
		        console.log(JSON.stringify(key));
		    }
		}
    });*/
	response.send({ "result": { "success": true, "error": null } });
});
app.get('/?', function(request, response) 
{
	var params = {};
	params['mode'] = request.query.mode;
	params['preview'] = request.query.preview;
	params['path'] = request.query.path;
	download(params,response);
});
// start the server
app.listen(port);
console.log('Nodebackend started! At http://localhost:' + port);


function upload(field,request)
{

}
function download(params,response)
{
	var name = __dirname+directory.substring(1)+params.path;
	var preview = params.preview;
	try
	{
		var filename = name.replace(/^.*[\\\/]/, '');
  		var mimetype = mime.lookup(name);
  		if(preview=="true")
  		{
  			response.sendFile(name);
  		}
  		else
  		{
			response.setHeader('Content-disposition', 'attachment; filename=' + filename);
			response.setHeader('Content-type', mimetype);

			var filestream = fs.createReadStream(file);
			filestream.pipe(response);
		}

	}
	catch(ex)
	{
		response.send({ "result": 
		{
			"success": false,
			"error": "Error retrieving file."
		}});
	}	
}
function readfile(params,response)
{
	var name = directory+params.path;
	try
	{
		fs.readFile(name, 'utf8', function (err,data) 
		{
		  if (err) 
		  {
		    return console.log(err);
		  }
		  response.send({ "result":  data  });
		});

		
	}
	catch(ex)
	{
		response.send({ "result": { "success": false, "error": "Error reading file." } });	
		console.log(JSON.stringify(params));
	}
	
}
function writefile(params,response)
{
	var name = directory+params.path;
	try
	{
		fs.writeFile(name, params.content, function(err)
		{
		  if (err) 
		  {
		    return console.log(err);
		  }
		  response.send({ "result": { "success": true, "error": null } });
		});

		
	}
	catch(ex)
	{
		response.send({ "result": { "success": false, "error": "Error reading file." } });	
		console.log(JSON.stringify(params));
	}
	
}
function addfolder(params,response)
{
	var name = directory+params.path+"/"+params.name;
	try
	{
		shell.mkdir(name);
		if(shell.error()) throw "error";

		response.send({ "result": { "success": true, "error": null } });
	}
	catch(ex)
	{
		response.send({ "result": { "success": false, "error": shell.error() } });	
		console.log(JSON.stringify(params));
	}
	
}
function move_rename(params,response)
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
function copy(params,response)
{
	var source = directory+params.path;
	var destinationtemp = (directory+params.newPath);
	destination = destinationtemp.replace(destinationtemp.replace(/^.*[\\\/]/, ''),'');
	
	try
	{
		if(fs.lstatSync(source).isDirectory())
		{
			shell.cp('-rf',source, destinationtemp);
		}
		else shell.cp(source, destinationtemp);

		if(shell.error()) throw "error";

		response.send({ "result": { "success": true, "error": null } });
	}
	catch(ex)
	{
		response.send({ "result": { "success": false, "error": shell.error() } });	
		console.log(JSON.stringify(params));
	}
	
}
function deleter(params,response)
{	
	var target = directory+params.path;

	try
	{
		shell.rm('-rf', target);
		if(shell.error()) throw "error";

		response.send({ "result": { "success": true, "error": null } });
	}
	catch(ex)
	{
		response.send({ "result": { "success": false, "error": shell.error() } });	
		console.log(JSON.stringify(params));
	}
	
}
function compress(params,response)
{	
	var source = directory+params.path;
	var target = directory+params.destination;
	try
	{
		var archive = archiver.create('zip', {});
		var output = fs.createWriteStream(target);
		archive.directory(source,source.replace(/^.*[\\\/]/, ''));
		archive.pipe(output);
		archive.on('finish', function () 
		{ 
			//Should we wait for the zip to finish before responding?
			response.send({ "result": { "success": true, "error": null } });	
		});
		archive.finalize();

	}
	catch(ex)
	{
		response.send({ "result": { "success": false, "error": shell.error() } });	
		console.log(JSON.stringify(params));
	}
	
}

function extract(params,response)
{	
	var source = directory+params.path;
	var target = directory+params.destination;
	try
	{
		var unzipper = new decompress(source)
		unzipper.on('error', function (err) 
		{
		    response.send({ "result": { "success": false, "error": err } });	
		});
		 
		unzipper.on('extract', function (log) 
		{
			response.send({ "result": { "success": true, "error": null } });	
		});
		unzipper.extract({
		    path: target,
		    filter: function (file) {
		        return file.type !== "SymbolicLink";
		    }
		});

	}
	catch(ex)
	{
		response.send({ "result": { "success": false, "error": shell.error() } });	
		console.log(JSON.stringify(params));
	}
	
}
function changepermissions(params,response)
{
	var name = directory+params.path;
	var octal = params.perms;
	var recursive = params.recursive;
	try
	{
		if(recursive===false || recursive=="false")
		{
			shell.chmod(octal, name);
		}
		else
		{
			shell.chmod("-R",octal, name);
		}
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
			var mode = new stat_mode(stat);
			var per = mode.toString().replace(/s/,'x');
			console.log(files[i]+" | "+per);
			var filetype = "file";
			if(stat.isDirectory()) filetype = "dir";
			result.push({
				"name": files[i].replace(/^.*[\\\/]/, ''),
		        "rights": per,
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