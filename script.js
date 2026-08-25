'use strict';

/*
 * Composición de páginas de Talmud en HTML/CSS/JS.
 * Autor original: Barak z"l
 */

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

var pageCounter = 0;
var pageLimit = 15;
var startMasechet = 'Bava_Batra';
var startDaf = '2a';

var pageWidth = 561;
var pageHeight = 793;
var pageVerticalPadding = 20;

var commentarist = 'Rashi';

var currentRef = startMasechet + '.' + startDaf;

// Fragmentos que quedaron pendientes de la página anterior
var recoveredMain = null;
var recoveredCommentary = null;
var recoveredRef = null;

// Estado de ejecución
var sectionCounter = 0;
var finished = 0;
var isRunning = false;

$.ajaxSetup({ cache: true });

$(document).ready(function () {
    // Las fuentes deben estar cargadas ANTES de medir alturas: si no, la
    // paginación se calcula con la fuente de reemplazo y sale mal.
    WebFont.load({
        custom: { families: ['Vilna', 'Rashi'] },
        active: enableStart,
        inactive: enableStart
    });
    $('#start').on('click', start);
});

function enableStart() {
    $('#start').prop('disabled', false);
    setStatus('Listo.');
}

function setStatus(text) {
    $('#status').text(text);
}

function start() {
    if (isRunning) return;
    isRunning = true;
    $('#start').prop('disabled', true);
    setStatus('Cargando ' + currentRef + '…');
    getData();
}

function finish(message) {
    isRunning = false;
    $('#start').prop('disabled', false);
    setStatus(message || ('Terminado: ' + pageCounter + ' páginas.'));
}

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------

function getUrl(ref) {
    return 'https://www.sefaria.org/api/texts/' + ref +
        '/he/Wikisource_Talmud_Bavli?context=0&pad=0&commentary=1';
}

function getData() {
    var cached = localStorage.getItem(currentRef);

    if (cached !== null) {
        try {
            addData(JSON.parse(cached));
        } catch (e) {
            // Caché corrupta: la tiramos y pedimos de nuevo.
            localStorage.removeItem(currentRef);
            fetchData();
        }
        return;
    }

    fetchData();
}

function fetchData() {
    var ref = currentRef;
    setStatus('Descargando ' + ref + '…');

    $.getJSON(getUrl(ref))
        .done(function (data) {
            cacheData(ref, data);
            addData(data);
        })
        .fail(function (jqXHR, textStatus) {
            var detail = jqXHR.status ? ('HTTP ' + jqXHR.status) : textStatus;
            console.error('Falló la petición de ' + ref + ': ' + detail);
            addWarning('Sin datos: ' + ref);
            finish('Error al descargar ' + ref + ' (' + detail + ').');
        });
}

function cacheData(ref, data) {
    try {
        localStorage.setItem(ref, JSON.stringify(data));
    } catch (e) {
        // Si no cabe, seguimos sin caché. NO vaciamos localStorage entero:
        // borraría datos de otras partes del mismo origen, y el reintento
        // volvería a fallar si el objeto por sí solo excede la cuota.
        console.warn('No se pudo guardar ' + ref + ' en caché (' + e.name + ').');
    }
}

// ---------------------------------------------------------------------------
// Construcción de la página
// ---------------------------------------------------------------------------

function addData(data) {
    if (!data || !data.he || !data.he.length) {
        finish('La respuesta de Sefaria no trae texto para ' + currentRef + '.');
        return;
    }

    var commentaryList = data.commentary || [];

    sectionCounter = 0;
    finished = 0;

    if (pageCounter === 0) {
        addPage(data);
    }

    for (sectionCounter = 0; sectionCounter < data.he.length; sectionCounter++) {
        if (emptyPage()) {
            if (recoveredMain) {
                $('.page[page="' + pageCounter + '"] .mainText').append(recoveredMain);
                recoveredMain = null;
            }
            if (recoveredRef) {
                $('.page[page="' + pageCounter + '"] .reference').append(recoveredRef);
                recoveredRef = null;
            }
            if (recoveredCommentary) {
                $('.page[page="' + pageCounter + '"] .commentary').append(recoveredCommentary);
                recoveredCommentary = null;
            }
        }

        var element = data.he[sectionCounter];
        if (typeof element !== 'string') element = String(element);

        var sectionRef = (currentRef + '.' + sectionCounter).replace(/ /g, '_');

        var newMain = $('<span ref="' + sectionRef + '">' + element.trim() + ' </span>');
        $('.page[page="' + pageCounter + '"] .mainText').append(newMain);

        // --- comentario ---------------------------------------------------
        var commentary = commentaryList.filter(function (el) {
            return el && el.collectiveTitle && el.collectiveTitle.en === commentarist &&
                el.anchorVerse === sectionCounter;
        });

        var newCommentary = null;
        if (commentary.length > 0) {
            newCommentary = $('<div anchorRef="' + sectionRef + '"></div>');
            $('.page[page="' + pageCounter + '"] .commentary').append(newCommentary);

            commentary.forEach(function (el) {
                var comment = el.he.split(/[–\.-](.+)/, 2);
                var newEl;
                if (comment.length > 1) {
                    newEl = '<span ref="' + el.ref + '"><span class="commentAnchor">' +
                        comment[0].trim() + '. </span> ' + comment[1].trim() + ' </span>';
                } else {
                    newEl = '<span ref="' + el.ref + '" class="noAnchor">' +
                        comment[0].trim() + ' </span>';
                }
                newCommentary.append(newEl);
            });
        }

        // --- referencias ---------------------------------------------------
        var validType = ['mishna in talmud', 'mesorat hashas'];
        var validCat = ['Mishna', 'Tanakh'];
        var references = commentaryList.filter(function (el) {
            return el && el.anchorVerse === sectionCounter &&
                (validType.indexOf(el.type) !== -1 || validCat.indexOf(el.category) !== -1);
        });

        var newReferences = null;
        if (references.length > 0) {
            newReferences = $('<div anchorRef="' + sectionRef + '"></div>');
            $('.page[page="' + pageCounter + '"] .reference').append(newReferences);

            references.forEach(function (el) {
                newReferences.append('<span ref="' + el.ref + '">' +
                    el.sourceHeRef.replace(/׳|״/g, '') + '; </span>');
            });
        }

        numberRefs();
        centerEndofChapter();
        adjustFloats();

        if (isOverflowed()) {
            if (newCommentary) {
                recoveredCommentary = fragment(
                    newCommentary,
                    $('<div anchorRef="' + newCommentary.attr('anchorref') + '" class="isContinuation"></div>')
                );
                if (recoveredCommentary) {
                    $('.page[page="' + pageCounter + '"] .commentary').addClass('continues');
                }
            }

            recoveredMain = fragment(
                newMain,
                $('<span ref="' + newMain.attr('ref') + '" class="isContinuation"></span>')
            );
            if (recoveredMain) {
                $('.page[page="' + pageCounter + '"] .mainText').addClass('continues');
            }

            if (newMain.text().trim() === '') {
                newMain.remove();
                $('.page[page="' + pageCounter + '"] .mainText').removeClass('continues');
                $('.page[page="' + pageCounter + '"] .commentary').removeClass('continues');
                if (newReferences) {
                    newReferences.detach();
                    recoveredRef = newReferences;
                }
            }

            adjustFloats();

            if (pageCounter < pageLimit) {
                addPage(data);
            } else {
                finished = (pageCounter === pageLimit) ? 1 : 0;
                break;
            }
        }
    }

    if (finished === 1 || data.next == null) {
        finish();
        return;
    }

    var cut = data.next.lastIndexOf(' ');
    currentRef = data.next.substring(0, cut).replace(/ /g, '_') +
        '.' + data.next.substring(cut + 1);

    setStatus('Página ' + pageCounter + ' — siguiendo en ' + currentRef + '…');
    getData();
}

function addPage(data) {
    if (isOverflowed()) addWarning('Unusual Overflow');
    if (pageCounter > 0 && itsTooEmpty()) addWarning('Too empty.');
    pageCounter++;
    $('body').append(
        '<div class="page" page="' + pageCounter + '">' +
        '<div class="warning"><ul></ul></div>' +
        header(data) +
        '<div class="mainText"></div>' +
        '<div class="commentary"></div>' +
        '<div class="reference"></div>' +
        '</div>'
    );
}

function header(data) {
    return '<div class="header">' + data.heIndexTitle + '</div>';
}

// ---------------------------------------------------------------------------
// Fragmentación entre páginas
// ---------------------------------------------------------------------------

/*
 * Corta `$source` en el último punto donde todavía cabe en la página y mueve
 * el resto a `$continuation`.
 *
 * A diferencia de la versión anterior, esto conserva el marcado interno
 * (negritas del dibur ha-matjil, <big>, <b>…) en ambos lados del corte, y
 * localiza el punto de corte por búsqueda binaria en vez de mover palabra por
 * palabra: ~10 mediciones en lugar de una por palabra.
 *
 * Devuelve $continuation si hubo corte, o null si todo cupo.
 */
function fragment($source, $continuation) {
    var root = $source[0];
    var spans = wrapWords(root);

    if (spans.length === 0) {
        unwrapWords(root);
        return null;
    }

    var lastFitting = findLastFitting(spans);

    // Restauramos la visibilidad antes de tocar el árbol.
    showThrough(spans, spans.length - 1);

    if (lastFitting === spans.length - 1) {
        unwrapWords(root);
        adjustFloats();
        return null;
    }

    var tail = splitAfter(root, lastFitting >= 0 ? spans[lastFitting] : null);
    $continuation[0].appendChild(tail);

    unwrapWords(root);
    unwrapWords($continuation[0]);
    adjustFloats();

    return $continuation;
}

/*
 * Envuelve cada palabra en <span class="tempSpan"> recorriendo NODOS DE TEXTO,
 * sin tocar los elementos. Así el marcado sobrevive a la fragmentación.
 */
function wrapWords(root) {
    var spans = [];

    (function walk(node) {
        var children = Array.prototype.slice.call(node.childNodes);
        children.forEach(function (child) {
            if (child.nodeType === 3) {
                var parts = child.nodeValue.split(/(\s+)/);
                var frag = document.createDocumentFragment();
                var added = false;

                parts.forEach(function (part) {
                    if (part === '') return;
                    if (/^\s+$/.test(part)) {
                        frag.appendChild(document.createTextNode(part));
                        return;
                    }
                    var span = document.createElement('span');
                    span.className = 'tempSpan';
                    span.textContent = part;
                    frag.appendChild(span);
                    spans.push(span);
                    added = true;
                });

                if (added) node.replaceChild(frag, child);
            } else if (child.nodeType === 1) {
                walk(child);
            }
        });
    })(root);

    return spans;
}

// Deshace wrapWords dejando el texto plano y el marcado intacto.
function unwrapWords(root) {
    var spans = root.querySelectorAll ? root.querySelectorAll('span.tempSpan') : [];
    Array.prototype.slice.call(spans).forEach(function (span) {
        span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
    });
    if (root.normalize) root.normalize();
}

// Muestra los spans hasta `lastVisible` inclusive y oculta el resto.
function showThrough(spans, lastVisible) {
    for (var i = 0; i < spans.length; i++) {
        spans[i].style.display = (i <= lastVisible) ? '' : 'none';
    }
}

/*
 * Búsqueda binaria del último span que todavía cabe. Devuelve -1 si no cabe
 * ninguno. Al final verifica linealmente, por si el reacomodo de flotantes
 * rompe la monotonía en algún caso raro.
 */
function findLastFitting(spans) {
    showThrough(spans, spans.length - 1);
    adjustFloats();
    if (!isOverflowed()) return spans.length - 1;

    var lo = -1;
    var hi = spans.length - 1;

    while (lo < hi) {
        var mid = Math.floor((lo + hi + 1) / 2);
        showThrough(spans, mid);
        adjustFloats();
        if (isOverflowed()) {
            hi = mid - 1;
        } else {
            lo = mid;
        }
    }

    while (lo >= 0) {
        showThrough(spans, lo);
        adjustFloats();
        if (!isOverflowed()) break;
        lo--;
    }

    return lo;
}

/*
 * Extrae todo lo que sigue a `span` dentro de `root`, conservando la jerarquía
 * de elementos que lo envuelve (Range.extractContents reconstruye los
 * ancestros en el fragmento resultante).
 */
function splitAfter(root, span) {
    var range = document.createRange();
    if (span) {
        range.setStartAfter(span);
    } else {
        range.setStart(root, 0);
    }
    range.setEnd(root, root.childNodes.length);
    return range.extractContents();
}

// ---------------------------------------------------------------------------
// Medición y disposición
// ---------------------------------------------------------------------------

function isOverflowed(page) {
    page = page || pageCounter;
    if (pageCounter === 0) return false;

    var $reference = $('.page[page="' + page + '"] .reference');
    if ($reference.length === 0) return false;

    return $reference.position().top + $reference.outerHeight(true) >
        (pageHeight - pageVerticalPadding);
}

function adjustFloats(page) {
    page = page || pageCounter;

    var $page = $('.page[page="' + page + '"]');
    var mainText = $page.find('.mainText');
    var commentary = $page.find('.commentary');
    var reference = $page.find('.reference');

    if (mainText.outerHeight(true) > commentary.outerHeight(true)) {
        if (!mainText.hasClass('lessCommentary')) mainText.addClass('lessCommentary');
        if (!commentary.hasClass('lessCommentary')) commentary.addClass('lessCommentary');

        if (mainText[0] && commentary[0] && mainText[0].nextSibling === commentary[0]) {
            mainText.detach();
            mainText.appendTo($page);
        }
    }

    if (mainText.outerHeight(true) < commentary.outerHeight(true)) {
        if (mainText.hasClass('lessCommentary')) mainText.removeClass('lessCommentary');
        if (commentary.hasClass('lessCommentary')) commentary.removeClass('lessCommentary');

        if (mainText[0] && commentary[0] && commentary[0].nextSibling === mainText[0]) {
            commentary.detach();
            commentary.appendTo($page);
        }
    }

    reference.detach();
    reference.appendTo($page);
}

// Centra el "הדרן" de fin de capítulo. Acotado a la página actual: antes
// recorría el documento entero en cada sección.
function centerEndofChapter(page) {
    page = page || pageCounter;

    $('.page[page="' + page + '"] .mainText span[ref]:contains("הדרן")').each(function () {
        var $el = $(this);
        $el.addClass('endOfChapter');
        $el.height(pageHeight - this.offsetTop);
    });
}

function numberRefs(page) {
    page = page || pageCounter;

    var $page = $('.page[page="' + page + '"]');
    var $reference = $page.find('.reference');

    $reference.css('visibility', $reference.text() === '' ? 'hidden' : 'visible');

    $page.find('.mainText span').attr('refNum', '');

    var counter = 0;
    $reference.find('div').each(function () {
        counter++;
        $(this).attr('refNum', counter);
        $page.find('.mainText span[ref="' + $(this).attr('anchorref') + '"]').attr('refNum', counter);
    });
}

function addWarning(warning, page) {
    page = page || pageCounter;
    $('.page[page="' + page + '"] .warning ul').append('<li>' + warning + '</li>');
    console.warn(warning + ' On page ' + page + '.');
}

function itsTooEmpty(page) {
    page = page || pageCounter;

    var $last = $('.page[page="' + page + '"] > *:last-child');
    if ($last.length === 0) return false;

    var percent = ($last.position().top + $last.height()) *
        (100 / $('.page[page="' + page + '"]').height());

    return percent < 90;
}

function emptyPage(page) {
    page = page || pageCounter;
    return $('.page[page="' + page + '"] .mainText').text() === '';
}

function contentHeight(page) {
    page = page || pageCounter;
    return Math.max(
        $('.page[page="' + page + '"] .mainText').outerHeight(true),
        $('.page[page="' + page + '"] .commentary').outerHeight(true)
    ) + $('.page[page="' + page + '"] .reference').outerHeight(true);
}
