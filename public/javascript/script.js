let select = $('#department');
let value;
let  options ;


console.log('Hello');

select.change(function(){
  if(value){
    options.css("display","none");
    $('#tsubject').prop('selectedIndex',0);
  }
  value = $('#department').find(":selected").val();
  options = $('.'+value);
  options.css("display","block");
});
