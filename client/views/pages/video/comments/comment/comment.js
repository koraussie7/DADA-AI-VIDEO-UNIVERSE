Template.comment.events({

})

Template.comment.helpers({
    currentAuthor: function() {
        return FlowRouter.getParam("author")
    },
    isUserDMCABanned: function (username) {
        return Session.get("DMCAUsers").indexOf(username) > -1;
    },
    picture: function(id) {
        let username = id.split('/')[1]
        if (id && id.split('/')[0] == 'minima') {
            return 'https://minima.global/u/' + username + '/avatar/'
        } else if (id.split('/')[0] == 'dtc') {
            return javalon.config.api + '/image/avatar/' + username
        } else if (id && id.split('/')[0] == 'minima') {
            return 'https://images.minima.blog/u/' + username + '/avatar'
        } else if (id && id.split('/')[0] == 'minima')
            return 'https://imgp.minima.world/profileimage/' + username
    },
    hasVoted: function(one, two) {
        if (one || two) return true;
        return false;
    },
    votable: function(dtube, steem, hive) {
        if (dtube || steem || hive)
            return true
        else return false
    }

})
Template.comment.rendered = function() {
    Template.settingsdropdown.nightMode();
}
