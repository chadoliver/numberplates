// git clone git@heroku.com:numberplates.git -o heroku

var http = require('http');
var cheerio = require('cheerio');

var PORT = process.env.PORT||3000;
var HOST = process.env.IP||"0.0.0.0";

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function scrapeData (text) {
    
    var options = {normalizeWhitespace: true}
    var $ = cheerio.load(text, options);
    var rows = $('table').children();
    
    var year = rows.eq(0).children().eq(1).html().slice(0,-1);
    var make = rows.eq(1).children().eq(1).html().slice(0,-1);
    var model = rows.eq(2).children().eq(1).html().slice(0,-1);

    return "This vehicle is a" + toTitleCase(year + make + model) + '.';
}

function sendResponse (responseObj, status, message) {
    
    var prologue = '<?xml version="1.0" encoding="UTF-8"?><vxml version="2.1" xmlns="http://www.w3.org/2001/06/grammar"><form id="carJamResult"><block><prompt>';
	var epilogue = '</prompt></block></form></vxml>';
	
	responseObj.writeHead(status, {'Content-Type': 'text/plain'});
	if (message !== null) {
        responseObj.write(prologue);
        responseObj.write(message);
        responseObj.write(epilogue);
	}
    responseObj.end();
}

var acceptor = http.createServer().listen(PORT, HOST);
acceptor.on('request', function(upstreamRequest, upstreamResponse) {
    
    var numberplate = upstreamRequest.url.substring(1) || 'den32';
    
    if (numberplate === 'favicon.ico') {
        sendResponse (upstreamResponse, 404, null);
        return;
    } 
    else {
        
        var options = {
            host: 'www.carjam.co.nz',
            hostname: 'www.carjam.co.nz',
            path: '/car/?plate=' + numberplate,
            method: 'GET',
        };
        
        http.request(options, function(downstreamResponse) {
            
            downstreamResponse.setEncoding('utf8');
            var statusCode = downstreamResponse.statusCode;
            
            if (statusCode === 302) {
                sendResponse(upstreamResponse, statusCode, 'I\'m sorry, the database does not have any information about that car.');
                return;
            }
            else {
                var htmlBody = '';
                downstreamResponse.on('data', function(chunk) {
                    htmlBody += chunk;
                });
                downstreamResponse.on('end', function () {
                    var scrapedData = scrapeData(htmlBody);
                    sendResponse(upstreamResponse, statusCode, scrapedData);
                });
            }
        }).end();
    }
});