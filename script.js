pageCounter = 0;
pageLimit = 15;
startMasechet = "Bava_Batra";
startDaf = "2a";

pageWidth = 561;
pageHeight = 793;
pageVerticalPadding = 20;

commentarist = "Rashi";

currentRef = startMasechet+'.'+startDaf;
console.log(currentRef);

$.ajaxSetup({ cache: true});

$(document).ready(function(){
    WebFont.load({
        custom: {
          families: ['Vilna', 'Rashi']
        }
      });
    $('#start').click(start);
    // getData();
});

function start(){
    getData();
}

function getData(){
    // ges data on page by page basis
    if(localStorage.getItem(currentRef) == null){
        $.getJSON(getUrl(currentRef)).done(function(data){
            try {
                localStorage.setItem(currentRef, JSON.stringify(data));
            } catch(domException) {
                if (domException.name === 'QuotaExceededError' || domException.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                    localStorage.clear();
                    console.log('localStorage cleared.')
                    localStorage.setItem(currentRef, JSON.stringify(data));
                }
              }
            
            addData(data);
        });
    } else {
        addData(JSON.parse(localStorage.getItem(currentRef)));
    }
}

recoveredMain = '';
recoveredCommentary = '';
recoveredRef = '';

function addData(data){
    //console.log(data);
    // for commentary
    sectionCounter = 0;
    finished = 0;
    if (pageCounter == 0) {
        addPage(data);
    }
    for(sectionCounter = 0; sectionCounter < data.he.length; sectionCounter++){
        if(emptyPage()){
            if(recoveredMain != '') {
                $('.page[page="'+pageCounter+'"] .mainText').append(recoveredMain);
                recoveredMain = '';
            }
            if(recoveredRef != '') {
                $('.page[page="'+pageCounter+'"] .reference').append(recoveredRef);
                recoveredRef = '';
            }
            if(recoveredCommentary != '') {
                $('.page[page="'+pageCounter+'"] .commentary').append(recoveredCommentary);
                recoveredCommentary = '';
            }
        }
        
        element = data.he[sectionCounter];

        var sectionRef = currentRef+'.'+sectionCounter;
        sectionRef = sectionRef.replace(' ', '_');
        var newMain = $('<span ref="'+sectionRef+'">'+element.trim() + ' </span>');
        $('.page[page="'+pageCounter+'"] .mainText').append(newMain);

        var commentary = data.commentary.filter(el => {
            return el.collectiveTitle.en == commentarist && el.anchorVerse == sectionCounter;
        });
        var newCommentary = '';
        if (commentary.length > 0) {
            // console.log(commentary);
            newCommentary = $('<div anchorRef="'+sectionRef+'"></div>');
            $('.page[page="'+pageCounter+'"] .commentary').append(newCommentary);
        }
        commentary.forEach(el => {
            var comment = el.he.split(/[–\.-](.+)/, 2);
            if (comment.length > 1) {
                newEl = '<span ref="'+el.ref+'"><span class="commentAnchor">' + comment[0].trim() + '. </span> ' + comment[1].trim() + ' </span>';
            } else {
                newEl = '<span ref="' + el.ref + '" class="noAnchor">' + comment[0].trim() + ' </span>';
            }
            $('div[anchorRef="'+sectionRef.split('.').join('\\.')+'"]').append(newEl);
        });

        var validType = ["mishna in talmud", "mesorat hashas"];
        var validCat =  ["Mishna", "Tanakh"];
        var references = data.commentary.filter(el => {
            return el.anchorVerse == sectionCounter && (validType.includes(el.type) || validCat.includes(el.category));
        });
        var newReferences = '';
        if (references.length > 0) {
            newReferences = $('<div anchorRef="'+sectionRef+'"></div>');
            $('.page[page="'+pageCounter+'"] .reference').append(newReferences);
        }
        references.forEach(el => {
            newEl = '<span ref="'+el.ref+'">'+el.sourceHeRef.replace(/׳|״/g, '')+'; </span>';
            newReferences.append(newEl);
        });

        numberRefs();
        centerEndofChapter();
        adjustFloats();
        
        if(isOverflowed()){                
                if(newCommentary != ''){
                    //Fixing commentary overflow
                    newCommentary.children().each(function() {
                        el = $(this);
                        el.html(el.text());
                        finalText = '';
                        splitted = el.text().split(' ');
                        for(i = 0; i < splitted.length; i++) {
                            finalText += '<span class="tempSpan" index="'+i+'">'+splitted[i]+' </span>';
                        }
                        el.html(finalText);
                    });
                    adjustFloats();
                    recoveredCommentary = $('<div anchorRef="'+newCommentary.attr('anchorref')+'" class="isContinuation"></div>');
                    var wasOverflowed;
                    while(isOverflowed() && $('.page[page="'+pageCounter+'"] .commentary .tempSpan').length > 0){
                        currSpan = $('.page[page="'+pageCounter+'"] .commentary .tempSpan').last();
                        currSpan.detach();
                        currSpan.prependTo(recoveredCommentary);
                        adjustFloats();
                        wasOverflowed = 1;
                    }
                    if(wasOverflowed){
                        recoveredCommentary.html(recoveredCommentary.text());
                        $('.page[page="'+pageCounter+'"] .commentary').addClass('continues');
                        wasOverflowed = 0;
                    }
                }
                

                //Fixing mainText overflow
                finalText = '';
                newMain.html().split(' ').forEach((element) => {
                    finalText += '<span class="tempSpan">'+element+' </span>';
                });
                newMain.html(finalText);
                ref = newMain.attr('ref');


                recoveredMain = $('<span ref="'+ref+'" class="isContinuation"></span>');
                while(isOverflowed() && $('.page[page="'+pageCounter+'"] .mainText .tempSpan').length > 0){
                    currSpan = $('.page[page="'+pageCounter+'"] .mainText .tempSpan').last();
                    currSpan.detach();
                    currSpan.prependTo(recoveredMain);
                    adjustFloats();
                    wasOverflowed = 1;
                }
                if(wasOverflowed){
                    recoveredMain.html(recoveredMain.text());
                    $('.page[page="'+pageCounter+'"] .mainText').addClass('continues');
                    wasOverflowed = 0;
                }

                if(newMain.text() == ''){
                    newMain.remove();
                    $('.page[page="'+pageCounter+'"] .mainText').removeClass('continues');
                    $('.page[page="'+pageCounter+'"] .commentary').removeClass('continues');
                    if(newReferences != ''){
                        newReferences.detach();
                        recoveredRef = newReferences;
                    }
                    
                }
                
            adjustFloats();
            if(pageCounter < pageLimit){
                addPage(data);
            } else {
                if (pageCounter == pageLimit) {
                    finished = 1;
                } else {
                    finished = 0;
                }
                break;
            }
        }
    }

    if (finished == 1 || data.next == null) {
        return;
    }
    var next = data.next.substring(0, data.next.lastIndexOf(' ')).replace(' ', '_')+'.'+data.next.substring(data.next.lastIndexOf(' ') + 1);
    currentRef = next;
        // console.log(currentRef);
    getData();
}

function addPage(data){
    // if(pageCounter > 0) adjustFloats();
    if (isOverflowed()) addWarning('Unusual Overflow');
    if(pageCounter > 0 && itsTooEmpty()) addWarning('Too empty.');
    pageCounter++;
    $('body').append('<div class="page" page="'+pageCounter+'"><div class="warning"><ul></ul></div>'+header(data)+'<div class="mainText"></div><div class="commentary"></div><div class="reference"></div></div>');
    console.log('Added page '+pageCounter);
}

function header(data) {
    return '<div class="header">'+data.heIndexTitle+'</div>';

}

function getUrl(ref){
    return "https://www.sefaria.org/api/texts/"+ref+"/he/Wikisource_Talmud_Bavli?context=0&pad=0&commentary=1";
}

function isOverflowed(page=pageCounter){
    if(pageCounter==0) return false;
    return  $('.page[page="'+page+'"] .reference').position().top + $('.page[page="'+page+'"] .reference').outerHeight(true) > (pageHeight - pageVerticalPadding );
}

function adjustFloats(page=pageCounter) {


    mainText = $('.page[page="'+page+'"] .mainText');
    commentary = $('.page[page="'+page+'"] .commentary');
    reference = $('.page[page="'+page+'"] .reference');

    if(mainText.outerHeight(true) > commentary.outerHeight(true)) {
        if(!mainText.hasClass('lessCommentary')) mainText.addClass('lessCommentary');
        if(!commentary.hasClass('lessCommentary')) commentary.addClass('lessCommentary');

        if($('.page[page="'+page+'"] .mainText')[0].nextSibling == $('.page[page="'+page+'"] .commentary')[0]) {
            mainText.detach();
            mainText.appendTo($('.page[page="'+page+'"]'));
        }
    }

    if(mainText.outerHeight(true) < commentary.outerHeight(true)) {
        if(mainText.hasClass('lessCommentary')) mainText.removeClass('lessCommentary');
        if(commentary.hasClass('lessCommentary')) commentary.removeClass('lessCommentary');
        
        if($('.page[page="'+page+'"] .commentary')[0].nextSibling == $('.page[page="'+page+'"] .mainText')[0]) {
            commentary.detach();
            commentary.appendTo($('.page[page="'+page+'"]'));
        }
    }
    reference.detach();
    reference.appendTo($('.page[page="'+page+'"]'));

}

function centerEndofChapter() {
    try {
        $('span[ref]:contains("הדרן")').addClass('endOfChapter');
        $('span[ref]:contains("הדרן")').height(pageHeight - $('span[ref]:contains("הדרן")')[0].offsetTop);
    } catch {

    }
    
}

function numberRefs(page=pageCounter) {
    if($('.page[page="'+page+'"] .reference').text() == ''){
        $('.page[page="'+page+'"] .reference').css('visibility', 'hidden');
    } else {
        $('.page[page="'+page+'"] .reference').css('visibility', 'visible');
    }
    counter = 0;
    $('.page[page="'+page+'"] .mainText span').each((index, el) => {
        $(el).attr('refNum', '');
    })
    $('.page[page="'+page+'"] .reference div').each((index, el) => {
        counter++;
        $(el).attr('refNum', counter);

        $('.page[page="'+page+'"] .mainText span[ref="'+$(el).attr('anchorref')+'"]').attr('refNum', counter);
    });
}

function addWarning(warning, page=pageCounter) {
    $('.page[page="'+page+'"] .warning ul').append('<li>'+warning+'</li>');
    console.warn(warning+' On page '+page+'.');
}

function itsTooEmpty(page=pageCounter) {
    var percent = ($('.page[page="'+page+'"] > *:last-child').position().top + $('.page[page="'+page+'"] > *:last-child').height()) * (100 / $('.page[page="'+page+'"]').height());
    // console.log(biggerNumber($('.page[page="'+page+'"] .mainText').outerHeight(true), $('.page[page="'+page+'"] .commentary').outerHeight(true)));
    // console.log($('.page[page="'+page+'"]').height());
    if (percent < 90) return true;
    return false;
}

function emptyPage(page=pageCounter){
    if($('.page[page="'+page+'"] .mainText').text() == ''){
        return true;
    }
    return false;
}

function contentHeight(page=pageCounter) {
    return biggerNumber($('.page[page="'+page+'"] .mainText').outerHeight(true), $('.page[page="'+page+'"] .commentary').outerHeight(true)) + $('.page[page="'+page+'"] .reference').outerHeight(true);
}

function biggerNumber(a, b){
    if (a > b) return a;
    return b;
}

function fillLastLine(page=pageCounter) {
    $('.page[page="'+page+'"] .commentary div:last-child > span:last-child').append('<span class="end"></span>');
    console.log($('.end'));
    if ($('.end')[0].offsetLeft < (pageWidth / 2)) {
        // return 'left';
    }
    else {
        return 'right';
    }
}