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

    return "This vehicle is a" + toTitleCase(year + make + model);
}

var acceptor = http.createServer().listen(PORT, HOST);
acceptor.on('request', function(upstreamRequest, upstreamResponse) {
    
    var numberplate = upstreamRequest.url.substring(1) || 'den32';
    
    if (numberplate === 'favicon.ico') {
        upstreamResponse.writeHead(404, {'Content-Type': 'text/plain'});
        upstreamResponse.end();
        return;
    } 
    else {
        console.log('url:', upstreamRequest.url);
        
        var options = {
            host: 'www.carjam.co.nz',
            hostname: 'www.carjam.co.nz',
            path: '/car/?plate=' + numberplate,
            method: 'GET',
        };
        
        console.log(options);
        
        http.request(options, function(downstreamResponse) {
            
            downstreamResponse.setEncoding('utf8');
            
            var status = downstreamResponse.statusCode;
            console.log('STATUS: ' + downstreamResponse.statusCode);
            if (status === 302) {
                upstreamResponse.writeHead(status);
                upstreamResponse.write('I\'m sorry, the database does not have any information about that car');
                upstreamResponse.end();
                return;
            }
            
            var htmlBody = '';
            downstreamResponse.on('data', function(chunk) {
                htmlBody += chunk;
            });
            downstreamResponse.on('end', function () {
                var scrapedData = scrapeData(htmlBody);
                
                upstreamResponse.writeHead(200, {'Content-Type': 'text/plain'});
                upstreamResponse.write(scrapedData);
                upstreamResponse.end();
            });
        }).end();
    }
});