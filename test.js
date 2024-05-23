/** @format */

var secret = "JBSWY3DPEHPK3PXP";
var password = "aaaaaa";
const all = "abcdefghijklmnopqrstuvwxyz0123456789";

secret = secret.toLowerCase().split("");
for (var j = 0; j < password.length; j++) {
    secret[j % secret.length] =
        all[
            (all.indexOf(secret[j % secret.length]) +
                password[j].charCodeAt(0)) %
                all.length
        ];
}
for (var j = password.length - 1; j >= 0; j--) {
    let index =
        all.indexOf(secret[j % secret.length]) - password[j].charCodeAt(0);
    while (index < 0) {
        index += all.length;
    }
    secret[j % secret.length] = all[index];
}
console.log(secret.join(""));
