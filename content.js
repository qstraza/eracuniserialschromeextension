/**
 * Author: Rok Avbar, qstraza, rok@rojal.si
 * Date: 19.1.2018
 */

$( document ).ready(function() {
  $("body").on("DOMNodeInserted", ".DialogBox .DialogBoxContent", function(el){
    // Checking if hidden input field exists which determens popup is a Serial
    // number popup.
    if (!$(el.target).prop('id').length) {
      if ($(el.target).parents('form').has('input[value=ajaxPostUpdateItemSerialNumbers]').length) {
        // Add class for styling.
        $(el.currentTarget).parents('.DialogBox').addClass('serialParser');
        // Inject HTML in to DOM.
        $(el.currentTarget).append('<div id="serialParserWrapper"><div><h3>Serial Parser</h3></div><div><button name="go">Go</button><button name="clear">Clear Current Serials</button><button name="cleartextarea">Clear Text Below</button></div><textarea></textarea><div id="serialParserHelp"><div class="serialParserHelpTitle">How to use?</div><div class="serialParserHelpBody">Paste or type (and press Go) in serial numbers seperated by comma or any whitespace (tab, newline, space) and they will be parsed and filled in into text fields on the left as expected. You can also enter sequental serials as such "ABC001-ABC010" and parser will fill them in as expected. Just make sure, Starting serial has the same total length as end and there can only be one - (dash) in total.</div></div></div>');
      }
    }
  });
  // Listener when user clicks on help text.
  $("body").on('click', "#serialParserHelp .serialParserHelpTitle", function(event){
    $('#serialParserHelp .serialParserHelpBody').toggle();
  });
  // Listener when user clicks a button to clear a textarea.
  $("body").on('click', ".DialogBox .DialogBoxContent button[name=cleartextarea]", function(event){
    event.preventDefault();
    $('textarea', $(event.target).parents('#serialParserWrapper')).val('');
  });
  // Listener when user clicks OK to submit serial numbers to the server.
  $("body").on('click', "input[name=BUTTON_ajaxPostUpdateItemSerialNumbers]", function(event){
    var inputValues = Array.from($('input[type=text]', $(event.target).closest('form')).serializeArray(), x => x.value).filter(x => x.length);
    var duplicateSerials = getNonUniqueElements(inputValues);
    if (duplicateSerials !== false) {
      // TODO: Try to stop other events from firing.
      alert('Following serials are entered mutiple times: ' + duplicateSerials.join(", "));
    }
  });
  // Listener when user clicks a Go button to parse the serials.
  $("body").on('click', ".DialogBox .DialogBoxContent button[name=go]", function(event){
    event.preventDefault();
    fillSerials($('textarea', $(event.target).parents('#serialParserWrapper')).val(), $(event.target).closest('form'));
  });
  // Listener when user pastes text in to textarea.
  $("body").on('paste', ".DialogBox .DialogBoxContent textarea", function(event){
    fillSerials(event.originalEvent.clipboardData.getData('text'), $(event.target).closest('form'));
  });
  // Listener when user clicks to clear all current serial numbers entered.
  $("body").on('click', ".DialogBox .DialogBoxContent button[name=clear]", function(event){
    event.preventDefault();
    $('table input[type=text]', $(event.target).closest("form")).val('');
  });
});

/**
 * Gets text from and tries to return array of serial numbers.
 *
 * Serial numbers in txt can be seperated by comma or whitespace (\s). Serial
 * can be sequential, meaning if user enters ABC001-ABC005, five serials will
 * be returned by the function. All mentioned can be combined, eg:
 * if txt = "1,2   5 123   BC005,ABC001-ABC003", function will return:
 * ["1", "2", "5", "123", "BC005", "ABC001", "ABC002", "ABC003"]
 *
 * @param  {String} txt text which contains serial numbers.
 * @return {Array}     Parsed serial numbers.
 */
function parseSerials(txt) {
  // Getting serials numbers split by whitespace. Zero length elements are
  // ommited.
  var serials = txt.split(/[\s,]/).filter(s => s.length>0);
  // This is where we will save actual serial numbers to return at the end.
  var newSerials = [];
  // Looping thru serials.
  for (var i = 0; i < serials.length; i++) {
    var serial = serials[i];
    // We found a "-" which means that serial has "from to", eg:
    // 111-114, which means we need to create 111,112,113,114.
    // eg2: 17A00321-17A00323 which translates to 17A00321,17A00322,17A00323
    if ((serial.match(/-/g) || []).length === 1) {
      var parts = serial.split('-');
      var start = parts[0];
      var end = parts[1];
      // First part must be the same length as end part. Reason for this is
      // because some serials have only one - but they are not meant to be
      // continues. Eg: ABC-1324.
      if (start.length === end.length) {
        // Getting all the numeric parts from the start and end of serial.
        var partedSerialStart = start.match(/\d+/g);
        var partedSerialEnd = end.match(/\d+/g);
        // If we have a match...
        if (partedSerialStart && partedSerialEnd) {
          // Pushing first serial in sequence.
          newSerials.push(start);
          // Getting the last set of numbers in a serial.
          var originalNumberStart = partedSerialStart.pop();
          // Parse it as an integer so we can do math.
          var currentNumberStart = parseInt(originalNumberStart);
          do {
            // Increasing serial for one.
            currentNumberStart++;
            // Making sure we keep leading zeros. Eg: if start is ABC001 we want
            // to keep fixed width, so after 10, we get ABC010.
            var newSerial = currentNumberStart.toString().padStart(originalNumberStart.length, "0");
            // Replacing number part of start with the new digit.
            newSerial = start.replace(originalNumberStart, newSerial);
            // Saving it.
            newSerials.push(newSerial);
          }
          // Do that until we get to the end.
          while (newSerial != end);
        }
      }
      else {
        newSerials.push(serial);
      }
    }
    else {
      newSerials.push(serial);
    }
  }
  return newSerials;
}

/**
 * Fills native eracuni text fields meant for serial numbers.
 *
 * @param  {String} textareaValue Value of the textare.
 * @param  {jQuery Element} $form     jQuery form of serial popup.
 */
function fillSerials(textareaValue, $form) {
  // Getting array of parsed serial numbers.
  var serials = parseSerials(textareaValue);
  // Checking what is the quantity of the item (ergo, number of serials).
  var numberOfInputs = $('input[type=text]', $form).length;
  // Going thru parsed serial numbers and fill the inputs.
  for (var i = 0; i < serials.length; i++) {
    var $input = $('input[name=serijskaStevilka_' + (i+1) + ']', $form);
    if ($input.length) {
      $input.val(serials[i]);
    }
  }
  // Get all values from inputs which are not blank.
  var inputValues = Array.from($('input[type=text]', $form).serializeArray(), x => x.value).filter(x => x.length);
  // Check if user entered more serials as there are available inputs.
  if (i - numberOfInputs >= 1) {
    alert('You entered/pasted ' + i + ' serials but you only have ' + numberOfInputs + ' serial textfields!');
  }
  // Check if user entered less as available inputs.
  else if (inputValues.length != numberOfInputs) {
    alert('You entered ' + inputValues.length + ' serials but you have ' + numberOfInputs + ' serial textfields!');
  }
  // Check if there are any serials which are entered twice.
  var duplicateSerials = getNonUniqueElements(inputValues);
  if (duplicateSerials !== false) {
    alert('Following serials are entered mutiple times: ' + duplicateSerials.join(", "));
  }
}

/**
 * Returns array of elements which are found more than once in an inputed array.
 * @param  {Array} arr Array of elements.
 * @return {Array}     Elements which were duplicates in original array.
 */
function getNonUniqueElements(arr) {
  var sorted_arr = arr.slice().sort();
  var results = [];
  for (var i = 0; i < sorted_arr.length - 1; i++) {
    if (sorted_arr[i + 1] == sorted_arr[i]) {
        results.push(sorted_arr[i]);
    }
  }
  return results.length ? results : false;
}
