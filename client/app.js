import './buffer';
import './minima';
import './rewards';
import jQuery from 'jquery';
import fetch from 'unfetch';

console.log('Starting DADA-Video-Universe (Minima)')

$.get("https://raw.githubusercontent.com/dtubego/dmca/master/dmca.json", function(json, result) {
  if (result == 'success') {
    json = JSON.parse(json);
    Session.set("DMCAUsers", json.authors);
  }
});
