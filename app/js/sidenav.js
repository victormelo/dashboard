/* Set the width of the side navigation to 250px */
function openNav() {
      $('#mySidenav').css({right:0});

}

/* Set the width of the side navigation to 0 */
function closeNav() {
      $('#mySidenav').css({right:-250});
}

function initSidemenu() {

    $(window).scroll(function () {
        if ($(window).scrollTop() > 46) {
            $('#mySidenav').css({top:0});
        }
        if ($(window).scrollTop() < 47) {
            $('#mySidenav').css({top:46-$(window).scrollTop()});
        }
    });
    $('.circle').click(function() {
        $this = $(this);
        if(parseInt($this.parent().css('right')) < 0) {
            openNav();
        } else {
            closeNav();
        }

    });
}

// <div class="content-details">

//     <div class="data-box data-caption">
//         <div class="data-item">
//             <span class='key'>Desde</span>
//             <span class='item'>01/01/17</span>
//         </div>
//     </div>

//     <div class="data-caption">Volume Médio de Atendimentos</div>
//     <div class="data-box">
//         <div class="data-item">
//             <span class='key'>12 Meses</span>
//             <span class='item'>1.000</span>
//         </div>
//        <div class="data-item">
//             <span class='key'>12 Meses</span>
//             <span class='item'>1.000</span>
//         </div>
//        <div class="data-item">
//             <span class='key'>12 Meses</span>
//             <span class='item'>1.000</span>
//         </div>
//     </div>

//     <div class="data-caption">Volume Médio de Atendimentos</div>
//     <div class="data-box">
//        <div class="data-item">
//             <span class='key'>ATENDE SUS</span>
//             <span class='item'>Não</span>
//         </div>
//     </div>
// </div>
