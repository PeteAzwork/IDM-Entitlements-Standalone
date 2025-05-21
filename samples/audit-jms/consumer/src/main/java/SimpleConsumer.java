/*
 * Copyright 2016-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
package consumer.src.main.java;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Hashtable;
import java.util.Properties;

import javax.jms.ConnectionFactory;
import javax.jms.JMSConsumer;
import javax.jms.JMSContext;
import javax.jms.JMSException;
import javax.jms.TextMessage;
import javax.jms.Topic;
import javax.naming.InitialContext;

/**
 * A Simple JMS Topic Consumer.
 */
public final class SimpleConsumer {
    private SimpleConsumer() {
        // hidden constructor
    }

    /**
     * Main method of SimpleConsumer.
     *
     * @param args commandline arguments
     * @throws Exception on failure to consume topic
     */
    public static void main(String[] args) throws Exception {
        if (args.length != 2) {
            System.out.println("Missing connection argument(s). For example: SimpleConsumer "
                    + "org.apache.activemq.artemis.jndi.ActiveMQInitialContextFactory tcp://localhost:61616");
            System.exit(1);
        }

        Hashtable<String, String> contextMap = new Hashtable<>();
        contextMap.put("java.naming.factory.initial", args[0]);
        contextMap.put("java.naming.provider.url", args[1]);
        contextMap.put("topic.forgerock.idm.audit", "forgerock.idm.audit");
        InitialContext context = new InitialContext(contextMap);

        Properties jmsConfig = new Properties();
        jmsConfig.put("connectionFactory", "ConnectionFactory");
        jmsConfig.put("topic", "forgerock.idm.audit");

        ConnectionFactory connectionFactory;
        try {
            connectionFactory = (ConnectionFactory) context.lookup(jmsConfig.getProperty("connectionFactory"));
            System.out.println("Connection factory=" + connectionFactory.getClass().getName());

            try (JMSContext jmsContext = connectionFactory.createContext()) {

                // lookup topic
                String topicName = jmsConfig.getProperty("topic");
                Topic jmsTopic = jmsContext.createTopic(topicName);

                // create a new subscriber to receive messages
                final JMSConsumer consumer = jmsContext.createConsumer(jmsTopic);
                consumer.setMessageListener(message -> {
                    try {
                        if (message instanceof TextMessage) {
                            System.out.println("--------Message "
                                    + new SimpleDateFormat("E yyyy.MM.dd 'at' HH:mm:ss.SSS z").format(new Date())
                                    + "--------");
                            System.out.println(((TextMessage) message).getText());
                            System.out.println("----------------------------------------------------------");
                        } else {
                            System.out.println("--------Received a non-TextMessage--------");
                        }
                    } catch (JMSException e) {
                        throw new IllegalStateException(e);
                    }
                });
                jmsContext.start();
                System.out.println("READY, listening for messages. (Press 'Enter' to exit)");
                System.in.read();
            }
        } catch (Exception e) {
            System.out.println("Caught: " + e);
            e.printStackTrace();
        }
    }
}
