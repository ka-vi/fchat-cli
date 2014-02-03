#f-list.net F-Chat CLI client
F-Chat CLI is an ncurses like client for role playing on F-Chat.  For those that don't know, an ncurses like interface is based in the command line: all text!

This software requires node.js to run, which you can get here: http://nodejs.org/

Once you have node.js installed, grab a copy of the program from here: https://github.com/ka-vi/fchat-cli/releases 

After unzipping to a directory, go to it from a terminal, and type:
```
npm install
```

After that, create a config.js based on the config-sample.js file:
```
cp config-sample.js config.js
```

Use your favorite text editor to edit the values accordingly.  Once done, make your logs directory:
```
mkdir logs
```

Finally, start the program:
```
node index.js
```

#General Usage
Once the Main Window says you've been connected to your character, you may use a couple of commands to get a public and private channel list.  ```/cha``` is for Public channels, and ```/ors``` is for private.  Use the up and down arrows to get to what channel you want, and hit enter to join.  Use ```Control + s``` to change the sorting method between alphabetical and by user count.  To exit the channel list, hit ```escape```.

You can hit tab to move to the userlist, and use the up/down/page up/page down keys to scroll the user list.  Use ```/pm username``` to create a new window for private messaging.

```Control + c``` is used to bring up the exit dialog.
