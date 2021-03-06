//This file implements functions to look up currently active alerts from the ps2 alerts website

const Discord = require('discord.js');
var alerts = require('./alerts.json');
var got = require('got');
var messageHandler = require('./messageHandler.js');

var alertInfo = async function(server){
	let uri = 'https://staging.api.ps2alerts.com/instances/active?world='+server;
	let response = await got(uri).json();
	if(typeof(response.error) !== 'undefined'){
		return new Promise(function(resolve, reject){
			reject(response.error);
		})
	}
	if(response.statusCode == 404){
		return new Promise(function(resolve, reject){
			reject("API Unreachable");
		})
	}
	if(response.length == 0){
		return new Promise(function(resolve, reject){
			reject("No active alerts on "+ serverIdToName(server));
		})
	}
	let allAlerts = []
	for(let alert of response){
		if(typeof(alerts[alert.censusMetagameEventType]) === 'undefined'){
			console.log("Unable to find alert info for id "+alert.censusMetagameEventType);
			return new Promise(function(resolve, reject){
				reject("Alert lookup error");
			})
		}
		let now = Date.now();
		let start = Date.parse(alert.timeStarted);
		let resObj = {
			name: alerts[alert.censusMetagameEventType].name,
			description: alerts[alert.censusMetagameEventType].description,
			vs: alert.result.vs,
			nc: alert.result.nc,
			tr: alert.result.tr,
			continent: alert.zone,
			timeSinceStart: now-start,
			timeLeft: (start+alert.duration)-now,
			instanceId: alert.instanceId
		}
		allAlerts.push(resObj);
	}
	
	return new Promise(function(resolve, reject){
		resolve(allAlerts);
	})
}

serverToId = function(name){
	switch(name){
		case "connery":
			return 1;
		case "miller":
			return 10;
		case "cobalt":
			return 13;
		case "emerald":
			return 17;
		case "jaegar":
			return 19;
		case "soltech":
			return 40;
		case "genudine":
			return 1000;
		case "ceres":
			return 2000;
		default:
			return false;
		
	}
}

serverIdToName = function(server){
    switch(server){
        case 1:
            return "Connery";
        case 10:
            return "Miller";
        case 13:
            return "Cobalt";
        case 17:
            return "Emerald";
        case 19:
            return "Jaegar";
        case 40:
            return "SolTech";
        case 1000:
            return "Genudine";
        case 2000:
            return "Ceres";
    }
}

module.exports = {
	activeAlerts: async function(server){
		if(messageHandler.badQuery(server)){
			return new Promise(function(resolve, reject){
                reject("Server search contains disallowed characters");
            })
		}

		let serverId = serverToId(server);

		if(!serverId){
			return new Promise(function(resolve, reject){
                reject(server+" not found.");
            })
		}
		
		let alertObj = "";
		try{
			alertObj = await alertInfo(serverId);
		}
		catch(err){
			if(err == "No active alerts"){
				return new Promise(function(resolve, reject){
					reject("No active alerts on "+server);
				})
			}
			else{
				return new Promise(function(resolve, reject){
					reject(err);
				})
			}
		}
		let sendEmbed = new Discord.MessageEmbed();
		sendEmbed.setTitle(serverIdToName(serverId)+" alerts");
		sendEmbed.setFooter("Data from ps2alerts.com");
		for(x in alertObj){
			let hoursSinceStart = Math.floor(alertObj[x].timeSinceStart/3600000);
			let minutesSinceStart = Math.floor(alertObj[x].timeSinceStart/60000) - hoursSinceStart*60;
			let hoursleft = Math.floor(alertObj[x].timeLeft/3600000);
			let minutesleft = Math.floor(alertObj[x].timeLeft/60000) - hoursleft*60;
			sendEmbed.addField(alertObj[x].name, "["+alertObj[x].description+"](https://staging.ps2alerts.com/alert/"+alertObj[x].instanceId+"?utm_source=auraxis-bot&utm_medium=discord&utm_campaign=partners)");
			sendEmbed.addField("Time since start", hoursSinceStart+"h "+minutesSinceStart+"m", true);
			sendEmbed.addField("Time left", hoursleft+"h "+minutesleft+"m", true);
			sendEmbed.addField('Territory %', 'VS: '+alertObj[x].vs+"% | "+'NC: '+alertObj[x].nc+"% | "+'TR: '+alertObj[x].tr+"%");
			if(x != alertObj.length-1){
				sendEmbed.addField('\u200b', '\u200b');
			}
		}
		return new Promise(function(resolve, reject){
			resolve(sendEmbed);
		})
	}
}