// Import the discord.js module
const Discord = require('discord.js');

const { Client } = require('pg');

// Import request for API access
var request = require('request');

// import async
var async = require('async');

var qu = async.queue(function(task, callback) {
	message = task.msg;
	alertList = task.aList;
	outfitList = task.oList;
	SQLclient = task.SClient;
	discordClient = task.dClient;
	//if message is a login/out event
	if(message.payload.character_id != null){
		character_id = message.payload.character_id;
		playerEvent = message.payload.event_name.substring(6);
		uri = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/character/'+character_id+'?c:resolve=outfit_member'
		//lookup character info and outfit membership
		var options = {uri:uri, playerEvent:playerEvent, outfitList:outfitList}
		request(options, function (error, response, body) {
			if(body != null && body != undefined){
				try{
					data = JSON.parse(body);
				}
				catch(e){
					console.log('Error with '+JSON.stringify(message.payload));
					//callback();
				}
				if (data == undefined || data.character_list == null)
				{
					callback();
				}
				else{
					resChar = data.character_list[0];
					if(resChar != null && resChar.outfit_member != null){
						//if character's outfit id is in the list of outfits that are subscribed to
						if (outfitList.indexOf(resChar.outfit_member.outfit_id) > -1)
						{
							//create and send rich embed to all subscribed channels
							
							SQLclient.query("SELECT * FROM outfit WHERE id="+resChar.outfit_member.outfit_id+";", (err, res) => {
								if (err){
									console.log(err);
								} 
								sendEmbed = new Discord.RichEmbed();
								sendEmbed.setTitle(res.rows[0].alias+' '+playerEvent);
								sendEmbed.setDescription(resChar.name.first);
								if (resChar.faction_id == "1") //vs
								{
									sendEmbed.setColor('PURPLE');
								}
								else if (resChar.faction_id == "2") //nc
								{
									sendEmbed.setColor('BLUE');
								}
								else if (resChar.faction_id == "3") //tr
								{
									sendEmbed.setColor('RED');
								}
								else //NSO
								{
									sendEmbed.setColor('GREY');
								}
								for (let row of res.rows){
									resChann = discordClient.channels.get(row.channel);
									if(resChann != undefined){
										resChann.send(sendEmbed);
									}
									//in case channel is deleted or otherwise inaccessible
									else{
										SQLclient.query("DELETE FROM outfit WHERE id="+resChar.outfit_member.outfit_id+" AND channel='"+row.channel+"';", (err, res) => {
											if (err){
												console.log(err);
											} 
										});
										//cleanup of subListOutfits is not performed as this should be automatic at restart
									}
								}
								callback();
							});
						}
						else{
							callback();
						}
					}
					else{
						callback();
					}
					
				}
			}
			else{
				console.log("null body error");
				callback();
			}
		})
	}
	//alert notification
	else if(message.payload.metagame_event_state_name != null){
		console.log('Alert notification');
		//ignore ending alerts
		if(message.payload.metagame_event_state_name == "started"){
			console.log("Alert start")
			url = 'https://census.daybreakgames.com/s:'+process.env.serviceID+'/get/ps2:v2/metagame_event/'+message.payload.metagame_event_id;
			try{
				request(url, function (error, response, body) {
					try{
						data = JSON.parse(body);
						if (data.metagame_event_list[0] == null){
							callback();
						}
						else{
							resEvent = data.metagame_event_list[0];
							sendEmbed = new Discord.RichEmbed();
							sendEmbed.setTitle(resEvent.name.en);
							sendEmbed.setDescription(resEvent.description.en);
							sendEmbed.addField('Status', message.payload.metagame_event_state_name, true);
							//color rich embed based on starting faction if applicable
							if (resEvent.name.en.includes('Enlightenment')){
								sendEmbed.setColor('PURPLE');
							}
							else if (resEvent.name.en.includes('Liberation')){
								sendEmbed.setColor('BLUE');
							}
							else if (resEvent.name.en.includes('Superiority')){
								sendEmbed.setColor('RED');
							}
							//add server to embed and send to appropriate channels
							switch (message.payload.world_id){
								case "1":
									inaccessible = []
									sendEmbed.addField('Server', 'Connery', true);
									for(x in alertList.connery){
										resChann = discordClient.channels.get(alertList.connery[x]);
										if(resChann != undefined){
											resChann.send(sendEmbed);
										}
										//inaccessible channel
										else{
											inaccessible.push(alertList.connery[x]);
											continue;
										}
									}
									if(inaccessible.length > 0){
										for(y in inaccessible){
											index = alertList.connery.indexOf(inaccessible[y]);
											if(index > -1){
												subListAlerts.connery.splice(index, 1);
												SQLclient.query("DELETE FROM connery WHERE channel='"+inaccessible[y]+"';", (err, res) => {
													if (err){
														console.log(err);
													} 
												});
											}
										}
									}
									callback();
									break;
								case "10":
									inaccessible = []
									sendEmbed.addField('Server', 'Miller', true);
									for(x in alertList.miller){
										resChann = discordClient.channels.get(alertList.miller[x]);
										if(resChann != undefined){
											resChann.send(sendEmbed);
										}
										//inaccessible channel
										else{
											inaccessible.push(alertList.miller[x]);
											continue;
										}
									}
									if(inaccessible.length > 0){
										for(y in inaccessible){
											index = alertList.miller.indexOf(inaccessible[y]);
											if(index > -1){
												subListAlerts.miller.splice(index, 1);
												SQLclient.query("DELETE FROM miller WHERE channel='"+inaccessible[y]+"';", (err, res) => {
													if (err){
														console.log(err);
													} 
												});
											}
										}
									}
									callback();
									break;
								case "13":
									inaccessible = []
									sendEmbed.addField('Server', 'Cobalt', true);
									for(x in alertList.cobalt){
										resChann = discordClient.channels.get(alertList.cobalt[x]);
										if(resChann != undefined){
											resChann.send(sendEmbed);
										}
										//inaccessible channel
										else{
											inaccessible.push(alertList.cobalt[x]);
											continue;
										}
									}
									if(inaccessible.length > 0){
										for(y in inaccessible){
											index = alertList.cobalt.indexOf(inaccessible[y]);
											if(index > -1){
												subListAlerts.cobalt.splice(index, 1);
												SQLclient.query("DELETE FROM cobalt WHERE channel='"+inaccessible[y]+"';", (err, res) => {
													if (err){
														console.log(err);
													} 
												});
											}
										}
									}
									callback();
									break;
								case "17":
									inaccessible = []
									sendEmbed.addField('Server', 'Emerald', true);
									for(x in alertList.emerald){
										resChann = discordClient.channels.get(alertList.emerald[x]);
										if(resChann != undefined){
											resChann.send(sendEmbed);
										}
										//inaccessible channel
										else{
											inaccessible.push(alertList.emerald[x]);
											continue;
										}
									}
									if(inaccessible.length > 0){
										for(y in inaccessible){
											index = alertList.emerald.indexOf(inaccessible[y]);
											if(index > -1){
												subListAlerts.emerald.splice(index, 1);
												SQLclient.query("DELETE FROM emerald WHERE channel='"+inaccessible[y]+"';", (err, res) => {
													if (err){
														console.log(err);
													} 
												});
											}
										}
									}
									callback();
									break;
								case "19":
									inaccessible = []
									sendEmbed.addField('Server', 'Jaegar', true);
									for(x in alertList.jaegar){
										resChann = discordClient.channels.get(alertList.jaegar[x]);
										if(resChann != undefined){
											resChann.send(sendEmbed);
										}
										//inaccessible channel
										else{
											inaccessible.push(alertList.jaegar[x])
											continue;
										}
									}
									if(inaccessible.length > 0){
										for(y in inaccessible){
											index = alertList.jaegar.indexOf(inaccessible[y]);
											if(index > -1){
												subListAlerts.jaegar.splice(index, 1);
												SQLclient.query("DELETE FROM jaegar WHERE channel='"+inaccessible[y]+"';", (err, res) => {
													if (err){
														console.log(err);
													} 
												});
											}
										}
									}
									callback();
									break;
								case "25":
									inaccessible = []
									sendEmbed.addField('Server', 'Briggs', true);
									for(x in alertList.briggs){
										resChann = discordClient.channels.get(alertList.briggs[x]);
										if(resChann != undefined){
											resChann.send(sendEmbed);
										}
										//inaccessible channel
										else{
											inaccessible.push(alertList.briggs[x])
											continue;
										}
									}
									if(inaccessible.length > 0){
										for(y in inaccessible){
											index = alertList.briggs.indexOf(inaccessible[y]);
											if(index > -1){
												subListAlerts.briggs.splice(index, 1);
												SQLclient.query("DELETE FROM briggs WHERE channel='"+inaccessible[y]+"';", (err, res) => {
													if (err){
														console.log(err);
													} 
												});
											}
										}
									}
									callback();
									break;
								case "40":
									inaccessible = []
									sendEmbed.addField('Server', 'SolTech', true);
									for(x in alertList.soltech){
										resChann = discordClient.channels.get(alertList.soltech[x]);
										if(resChann != undefined){
											resChann.send(sendEmbed);
										}
										//inaccessible channel
										else{
											inaccessible.push(alertList.soltech[x])
											continue;
										}
									}
									if(inaccessible.length > 0){
										for(y in inaccessible){
											index = alertList.soltech.indexOf(inaccessible[y]);
											if(index > -1){
												subListAlerts.soltech.splice(index, 1);
												SQLclient.query("DELETE FROM soltech WHERE channel='"+inaccessible[y]+"';", (err, res) => {
													if (err){
														console.log(err);
													} 
												});
											}
										}
									}
									callback();
							}
						}
					}
					catch(e){
						console.log('JSON error in alertType, payload = '+body+' lookup URI = '+uri);
						callback();
					}
				})
			}
			catch(e){
				callback();
			}
		}
		else{
			callback();
		}
	}
	
})

qu.drain = function() {

}


module.exports = {
	check: function(message, alertList, outfitList, SQLclient, discordClient){
		qu.push({msg: message, aList: alertList, oList: outfitList, SClient: SQLclient, dClient: discordClient}, function(err) {
			
		})
	}
}