pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/comparators.circom";

template LessThan10() {
    signal input in;
    signal output out;

    component lt = LessThan(32); 

    lt.in[0] <== in;
    lt.in[1] <== 10;

    out <== lt.out;
}

template Main() {
    signal input in;
    signal output out;

    component lessThan = LessThan10();
    lessThan.in <== in;
    out <== lessThan.out;
}

component main = Main();