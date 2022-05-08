pragma circom 2.0.0;

// [assignment] Modify the circuit below to perform a multiplication of three signals


template Multiplier2 () {
   signal input a;
   signal input b;
   signal output out;

   out <== a * b;
}

template Multiplier3 () {  
   // Declaration of signals.  
   signal input a;  
   signal input b;
   signal input c;
   
   signal output d;

   component m2a = Multiplier2();
   component m2b = Multiplier2();

   m2a.a <== a;
   m2a.b <== b;

   m2b.a <== m2a.out;
   m2b.b <== c;

   d <== m2b.out;
}

component main = Multiplier3();